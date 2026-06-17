package domain

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/nidao003/mclaw/backend/consts"
	"github.com/nidao003/mclaw/backend/db"
)

// PaymentUsecase defines the business logic for payment operations.
type PaymentUsecase interface {
	// CreateOrder creates a payment order and returns the payment URL.
	CreateOrder(ctx context.Context, userID uuid.UUID, req *CreateOrderReq) (*PaymentOrderResp, error)
	// GetOrder returns a payment order by ID.
	GetOrder(ctx context.Context, orderID uuid.UUID) (*PaymentOrder, error)
	// GetOrderByNo returns a payment order by merchant order number.
	GetOrderByNo(ctx context.Context, orderNo string) (*PaymentOrder, error)
	// ListOrders returns paginated payment orders for a user.
	ListOrders(ctx context.Context, userID uuid.UUID, req *ListOrderReq) (*ListOrderResp, error)
	// HandleCallback processes a payment provider callback (e.g. WeChat Pay webhook).
	HandleCallback(ctx context.Context, provider string, payload []byte) error
	// CancelOrder cancels an expired or pending order.
	CancelOrder(ctx context.Context, orderID uuid.UUID) error
	// ExpireOrders marks all expired pending orders as failed (cron job).
	ExpireOrders(ctx context.Context) error
}

// PaymentRepo defines the data access for payment orders.
type PaymentRepo interface {
	Create(ctx context.Context, order *db.PaymentOrder) (*db.PaymentOrder, error)
	GetByID(ctx context.Context, id uuid.UUID) (*db.PaymentOrder, error)
	GetByOrderNo(ctx context.Context, orderNo string) (*db.PaymentOrder, error)
	ListByUserID(ctx context.Context, userID uuid.UUID, req *ListOrderReq) ([]*db.PaymentOrder, int, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status consts.PaymentOrderStatus, tradeNo string, paidAt *time.Time) error
	ExpirePendingOrders(ctx context.Context, before time.Time) (int, error)
}

// --- Domain Models ---

// PaymentOrder represents a payment order in the system.
type PaymentOrder struct {
	ID          uuid.UUID                 `json:"id"`
	UserID      uuid.UUID                 `json:"user_id"`
	OrderNo     string                    `json:"order_no"`
	TradeNo     string                    `json:"trade_no,omitempty"`
	Type        consts.PaymentOrderType   `json:"type"`
	Amount      int64                     `json:"amount"`
	Status      consts.PaymentOrderStatus `json:"status"`
	Description string                    `json:"description,omitempty"`
	PaymentURL  string                    `json:"payment_url,omitempty"`
	Metadata    map[string]string         `json:"metadata,omitempty"`
	PaidAt      *time.Time                `json:"paid_at,omitempty"`
	ExpiredAt   *time.Time                `json:"expired_at,omitempty"`
	CreatedAt   time.Time                 `json:"created_at"`
}

func (o *PaymentOrder) From(src *db.PaymentOrder) *PaymentOrder {
	if src == nil {
		return o
	}
	o.ID = src.ID
	o.UserID = src.UserID
	o.OrderNo = src.OrderNo
	o.TradeNo = src.TradeNo
	o.Type = src.Type
	o.Amount = src.Amount
	o.Status = src.Status
	o.Description = src.Description
	o.PaymentURL = src.PaymentURL
	o.Metadata = src.Metadata
	o.PaidAt = &src.PaidAt
	o.ExpiredAt = &src.ExpiredAt
	o.CreatedAt = src.CreatedAt
	return o
}

// --- Request/Response Types ---

// CreateOrderReq is the request to create a payment order.
type CreateOrderReq struct {
	Type        consts.PaymentOrderType      `json:"type" validate:"required"`
	Amount      int64                         `json:"amount" validate:"required"` // amount in cents
	Plan        consts.SubscriptionPlan       `json:"plan,omitempty"`
	PeriodUnit  consts.SubscriptionPeriodUnit `json:"period_unit,omitempty"`
	PeriodCount int                           `json:"period_count,omitempty"`
	Description string                        `json:"description,omitempty"`
}

// PaymentOrderResp is the response after creating a payment order.
type PaymentOrderResp struct {
	OrderID    uuid.UUID `json:"order_id"`
	OrderNo    string    `json:"order_no"`
	PaymentURL string    `json:"payment_url"`
	Amount     int64     `json:"amount"`
	Status     string    `json:"status"`
	ExpiredAt  *time.Time `json:"expired_at,omitempty"`
}

// ListOrderReq is the request for paginated order listing.
type ListOrderReq struct {
	Cursor string `query:"cursor"`
	Limit  int    `query:"limit"`
	Status string `query:"status,omitempty"`
}

// ListOrderResp is the paginated order listing response.
type ListOrderResp struct {
	Orders []*PaymentOrder `json:"orders"`
	Page   *CursorPage     `json:"page,omitempty"`
}
