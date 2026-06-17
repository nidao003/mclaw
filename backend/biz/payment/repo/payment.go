package repo

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/samber/do"
	"go.uber.org/zap"

	"github.com/nidao003/mclaw/backend/consts"
	"github.com/nidao003/mclaw/backend/db"
	"github.com/nidao003/mclaw/backend/db/paymentorder"
	"github.com/nidao003/mclaw/backend/domain"
	"github.com/nidao003/mclaw/backend/errcode"
)

type paymentRepo struct {
	client *db.Client
	log    *zap.Logger
}

// NewPaymentRepo creates a new PaymentRepo instance.
func NewPaymentRepo(i *do.Injector) (domain.PaymentRepo, error) {
	dbClient := do.MustInvoke[*db.Client](i)
	logger := do.MustInvoke[*zap.Logger](i)
	return &paymentRepo{client: dbClient, log: logger}, nil
}

func (r *paymentRepo) Create(ctx context.Context, order *db.PaymentOrder) (*db.PaymentOrder, error) {
	created, err := r.client.PaymentOrder.Create().
		SetUserID(order.UserID).
		SetOrderNo(order.OrderNo).
		SetType(order.Type).
		SetAmount(order.Amount).
		SetStatus(order.Status).
		SetDescription(order.Description).
		SetPaymentURL(order.PaymentURL).
		SetMetadata(order.Metadata).
		SetExpiredAt(order.ExpiredAt).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create payment order: %w", err)
	}
	return created, nil
}

func (r *paymentRepo) GetByID(ctx context.Context, id uuid.UUID) (*db.PaymentOrder, error) {
	order, err := r.client.PaymentOrder.Get(ctx, id)
	if err != nil {
		if db.IsNotFound(err) {
			return nil, errcode.ErrOrderNotFound
		}
		return nil, fmt.Errorf("failed to get payment order: %w", err)
	}
	return order, nil
}

func (r *paymentRepo) GetByOrderNo(ctx context.Context, orderNo string) (*db.PaymentOrder, error) {
	order, err := r.client.PaymentOrder.Query().
		Where(paymentorder.OrderNo(orderNo)).
		Only(ctx)
	if err != nil {
		if db.IsNotFound(err) {
			return nil, errcode.ErrOrderNotFound
		}
		return nil, fmt.Errorf("failed to get payment order by order_no: %w", err)
	}
	return order, nil
}

func (r *paymentRepo) ListByUserID(ctx context.Context, userID uuid.UUID, req *domain.ListOrderReq) ([]*db.PaymentOrder, int, error) {
	query := r.client.PaymentOrder.Query().
		Where(paymentorder.UserID(userID))

	// Filter by status if specified
	if req.Status != "" {
		query = query.Where(paymentorder.Status(consts.PaymentOrderStatus(req.Status)))
	}

	// Default ordering: newest first
	query = query.Order(db.Desc(paymentorder.FieldCreatedAt))

	// Apply cursor-based pagination
	if req.Cursor != "" {
		cursorID, err := uuid.Parse(req.Cursor)
		if err == nil {
			cursorOrder, err := r.client.PaymentOrder.Get(ctx, cursorID)
			if err == nil {
				query = query.Where(
					paymentorder.Or(
						paymentorder.CreatedAtLT(cursorOrder.CreatedAt),
						paymentorder.And(
							paymentorder.CreatedAtEQ(cursorOrder.CreatedAt),
							paymentorder.IDLT(cursorID),
						),
					),
				)
			}
		}
	}

	limit := req.Limit
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	orders, err := query.Limit(limit + 1).All(ctx)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list payment orders: %w", err)
	}

	hasMore := len(orders) > limit
	if hasMore {
		orders = orders[:limit]
	}

	return orders, len(orders), nil
}

func (r *paymentRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status consts.PaymentOrderStatus, tradeNo string, paidAt *time.Time) error {
	update := r.client.PaymentOrder.UpdateOneID(id).
		SetStatus(status)

	if tradeNo != "" {
		update = update.SetTradeNo(tradeNo)
	}
	if paidAt != nil {
		update = update.SetPaidAt(*paidAt)
	}

	_, err := update.Save(ctx)
	if err != nil {
		return fmt.Errorf("failed to update payment order status: %w", err)
	}
	return nil
}

func (r *paymentRepo) ExpirePendingOrders(ctx context.Context, before time.Time) (int, error) {
	n, err := r.client.PaymentOrder.Update().
		Where(
			paymentorder.Status(consts.PaymentPending),
			paymentorder.ExpiredAtLT(before),
		).
		SetStatus(consts.PaymentFailed).
		Save(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to expire pending orders: %w", err)
	}
	return n, nil
}
