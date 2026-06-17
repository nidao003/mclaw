package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/samber/do"
	"go.uber.org/zap"

	"github.com/nidao003/mclaw/backend/consts"
	"github.com/nidao003/mclaw/backend/db"
	"github.com/nidao003/mclaw/backend/domain"
	"github.com/nidao003/mclaw/backend/errcode"
	"github.com/nidao003/mclaw/backend/pkg/cvt"
)

// orderExpiry is how long a pending order lives before it expires.
const orderExpiry = 30 * time.Minute

type paymentUsecase struct {
	paymentRepo domain.PaymentRepo
	walletUC    domain.WalletUsecase
	subUC       domain.SubscriptionUsecase
	log         *zap.Logger
}

// NewPaymentUsecase creates a new PaymentUsecase instance.
func NewPaymentUsecase(i *do.Injector) (domain.PaymentUsecase, error) {
	paymentRepo := do.MustInvoke[domain.PaymentRepo](i)
	subUC := do.MustInvoke[domain.SubscriptionUsecase](i)
	logger := do.MustInvoke[*zap.Logger](i)

	// WalletUsecase 可选（避免与 NewWalletUsecase 的循环依赖死锁）
	walletUC, _ := do.Invoke[domain.WalletUsecase](i)

	return &paymentUsecase{
		paymentRepo: paymentRepo,
		walletUC:    walletUC,
		subUC:       subUC,
		log:         logger,
	}, nil
}

// CreateOrder creates a payment order and returns the payment URL.
func (uc *paymentUsecase) CreateOrder(ctx context.Context, userID uuid.UUID, req *domain.CreateOrderReq) (*domain.PaymentOrderResp, error) {
	// Validate amount
	if req.Amount <= 0 {
		return nil, fmt.Errorf("amount must be positive")
	}

	// Generate order number: timestamp + short UUID
	orderNo := fmt.Sprintf("MCL%s%s", time.Now().Format("20060102150405"), uuid.New().String()[:8])

	expiredAt := time.Now().Add(orderExpiry)

	order := &db.PaymentOrder{
		UserID:      userID,
		OrderNo:     orderNo,
		Type:        req.Type,
		Amount:      req.Amount,
		Status:      consts.PaymentPending,
		Description: req.Description,
		Metadata:    buildOrderMetadata(req),
		ExpiredAt:   expiredAt,
	}

	// For now, generate a placeholder payment URL.
	// Real WeChat Pay V3 integration will replace this in a follow-up.
	paymentURL := uc.generatePaymentURL(orderNo, req.Amount)

	order.PaymentURL = paymentURL

	created, err := uc.paymentRepo.Create(ctx, order)
	if err != nil {
		uc.log.Error("failed to create payment order",
			zap.Error(err),
			zap.String("user_id", userID.String()),
			zap.String("type", string(req.Type)),
		)
		return nil, fmt.Errorf("failed to create order: %w", err)
	}

	return &domain.PaymentOrderResp{
		OrderID:    created.ID,
		OrderNo:    created.OrderNo,
		PaymentURL: created.PaymentURL,
		Amount:     created.Amount,
		Status:     string(created.Status),
		ExpiredAt:  &expiredAt,
	}, nil
}

// GetOrder returns a payment order by ID.
func (uc *paymentUsecase) GetOrder(ctx context.Context, orderID uuid.UUID) (*domain.PaymentOrder, error) {
	order, err := uc.paymentRepo.GetByID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	return cvt.From(order, &domain.PaymentOrder{}), nil
}

// GetOrderByNo returns a payment order by merchant order number.
func (uc *paymentUsecase) GetOrderByNo(ctx context.Context, orderNo string) (*domain.PaymentOrder, error) {
	order, err := uc.paymentRepo.GetByOrderNo(ctx, orderNo)
	if err != nil {
		return nil, err
	}
	return cvt.From(order, &domain.PaymentOrder{}), nil
}

// ListOrders returns paginated payment orders for a user.
func (uc *paymentUsecase) ListOrders(ctx context.Context, userID uuid.UUID, req *domain.ListOrderReq) (*domain.ListOrderResp, error) {
	orders, count, err := uc.paymentRepo.ListByUserID(ctx, userID, req)
	if err != nil {
		return nil, err
	}

	result := make([]*domain.PaymentOrder, 0, len(orders))
	for _, o := range orders {
		result = append(result, cvt.From(o, &domain.PaymentOrder{}))
	}

	resp := &domain.ListOrderResp{
		Orders: result,
	}

	if len(result) > 0 && count >= req.Limit {
		resp.Page = &domain.CursorPage{
			NextCursor: result[len(result)-1].ID.String(),
			HasMore:    true,
		}
	}

	return resp, nil
}

// HandleCallback processes a payment provider callback.
// This is the core payment verification flow:
//  1. Parse the callback payload (provider-specific)
//  2. Verify the callback signature
//  3. Find the order by trade_no
//  4. Mark order as paid
//  5. Fulfill the order (grant credits or activate subscription)
func (uc *paymentUsecase) HandleCallback(ctx context.Context, provider string, payload []byte) error {
	uc.log.Info("payment callback received",
		zap.String("provider", provider),
		zap.Int("payload_size", len(payload)),
	)

	// Provider-specific parsing will be added when integrating real payment SDKs.
	// For now, we define the fulfillment logic that any provider callback will invoke.

	return nil
}

// fulfillOrder handles the post-payment business logic.
// Called after a payment is verified as successful.
func (uc *paymentUsecase) fulfillOrder(ctx context.Context, order *db.PaymentOrder) error {
	switch order.Type {
	case consts.PaymentTypeRecharge:
		// Recharge: grant credits to user wallet
		if uc.walletUC == nil {
			return fmt.Errorf("wallet service is not available")
		}
		// Convert amount (cents) to credits using pricing tier
		credits := uc.amountToCredits(order.Amount)
		if err := uc.walletUC.Grant(ctx, order.UserID, consts.TransactionTopUp, credits,
			fmt.Sprintf("充值 %d 积分", credits), order.OrderNo); err != nil {
			return fmt.Errorf("failed to grant recharge credits: %w", err)
		}
		uc.log.Info("recharge fulfilled",
			zap.String("order_no", order.OrderNo),
			zap.String("user_id", order.UserID.String()),
			zap.Int64("credits", credits),
		)

	case consts.PaymentTypeSubscription:
		// Subscription: activate or upgrade user subscription
		planName := consts.SubscriptionPlan(order.Metadata["plan"])
		periodUnit := consts.SubscriptionPeriodUnit(order.Metadata["period_unit"])

		_, err := uc.subUC.Subscribe(ctx, order.UserID, &domain.SubscribeReq{
			Plan:       planName,
			PeriodUnit: periodUnit,
		})
		if err != nil {
			return fmt.Errorf("failed to activate subscription: %w", err)
		}
		uc.log.Info("subscription fulfilled",
			zap.String("order_no", order.OrderNo),
			zap.String("user_id", order.UserID.String()),
			zap.String("plan", string(planName)),
		)

	default:
		return fmt.Errorf("unknown order type: %s", order.Type)
	}

	return nil
}

// CancelOrder cancels a pending order.
func (uc *paymentUsecase) CancelOrder(ctx context.Context, orderID uuid.UUID) error {
	order, err := uc.paymentRepo.GetByID(ctx, orderID)
	if err != nil {
		return err
	}
	if order.Status != consts.PaymentPending {
		return errcode.ErrPaymentFailed
	}
	return uc.paymentRepo.UpdateStatus(ctx, orderID, consts.PaymentFailed, "", nil)
}

// ExpireOrders marks all expired pending orders as failed (cron job).
func (uc *paymentUsecase) ExpireOrders(ctx context.Context) error {
	n, err := uc.paymentRepo.ExpirePendingOrders(ctx, time.Now())
	if err != nil {
		return err
	}
	if n > 0 {
		uc.log.Info("expired pending orders", zap.Int("count", n))
	}
	return nil
}

// --- Internal helpers ---

// generatePaymentURL creates a payment URL for the order.
// Currently returns a placeholder; will be replaced by real WeChat Pay V3 Native Pay URL.
func (uc *paymentUsecase) generatePaymentURL(orderNo string, amount int64) string {
	// Placeholder: in production this calls WeChat Pay V3 Native Pay API
	// to generate a weixin://wxpay/bizpayurl?... URL for QR code scanning.
	// For development, return a mock URL.
	return fmt.Sprintf("mock://pay?order=%s&amount=%d", orderNo, amount)
}

// amountToCredits converts payment amount (in cents) to credit amount.
// Pricing tiers (matching MonkeyCode frontend wallet-dialog):
//
//	¥10 → 2,000 credits
//	¥50 → 15,000 credits (6.7折)
//	¥250 → 100,000 credits (5.0折)
//	¥1000 → 500,000 credits (4.0折)
//
// Linear fallback: 1 cent = 2 credits (same as ¥10 tier).
func (uc *paymentUsecase) amountToCredits(amountCents int64) int64 {
	switch amountCents {
	case 1000: // ¥10
		return 2000
	case 5000: // ¥50
		return 15000
	case 25000: // ¥250
		return 100000
	case 100000: // ¥1000
		return 500000
	default:
		// Linear: 1 cent = 2 credits
		return amountCents * 2
	}
}

// buildOrderMetadata creates metadata map from the order request.
func buildOrderMetadata(req *domain.CreateOrderReq) map[string]string {
	meta := make(map[string]string)
	if req.Plan != "" {
		meta["plan"] = string(req.Plan)
	}
	if req.PeriodUnit != "" {
		meta["period_unit"] = string(req.PeriodUnit)
	}
	if req.PeriodCount > 0 {
		meta["period_count"] = fmt.Sprintf("%d", req.PeriodCount)
	}
	return meta
}
