package v1

import (
	"fmt"
	"log/slog"

	"github.com/GoYoko/web"
	"github.com/google/uuid"
	"github.com/samber/do"

	"github.com/nidao003/mclaw/backend/domain"
	"github.com/nidao003/mclaw/backend/errcode"
	"github.com/nidao003/mclaw/backend/middleware"
)

// PaymentHandler handles payment-related API endpoints.
type PaymentHandler struct {
	paymentUsecase domain.PaymentUsecase
	logger         *slog.Logger
}

// NewPaymentHandler creates and registers payment route handlers.
func NewPaymentHandler(i *do.Injector) (*PaymentHandler, error) {
	w := do.MustInvoke[*web.Web](i)
	logger := do.MustInvoke[*slog.Logger](i)
	auth := do.MustInvoke[*middleware.AuthMiddleware](i)
	targetActive := do.MustInvoke[*middleware.TargetActiveMiddleware](i)
	paymentUC := do.MustInvoke[domain.PaymentUsecase](i)

	h := &PaymentHandler{
		paymentUsecase: paymentUC,
		logger:         logger.With("module", "payment.handler"),
	}

	// User-facing payment routes (require auth)
	users := w.Group("/api/v1/users")
	users.POST("/payment/orders", web.BindHandler(h.CreateOrder), auth.Auth(), targetActive.TargetActive())
	users.GET("/payment/orders", web.BaseHandler(h.ListOrders), auth.Auth(), targetActive.TargetActive())
	users.GET("/payment/orders/:id", web.BaseHandler(h.GetOrder), auth.Auth(), targetActive.TargetActive())
	users.POST("/payment/orders/:id/cancel", web.BaseHandler(h.CancelOrder), auth.Auth(), targetActive.TargetActive())

	// Payment callback (no auth — called by payment provider)
	w.POST("/api/v1/payment/callback/:provider", web.BaseHandler(h.HandleCallback))

	return h, nil
}

// CreateOrder creates a new payment order.
func (h *PaymentHandler) CreateOrder(c *web.Context, req *domain.CreateOrderReq) error {
	user := middleware.GetUser(c)
	if user == nil {
		return errcode.ErrUnauthorized
	}

	resp, err := h.paymentUsecase.CreateOrder(c.Request().Context(), user.ID, req)
	if err != nil {
		h.logger.Error("failed to create payment order", "error", err, "user_id", user.ID)
		return err
	}
	return c.Success(resp)
}

// GetOrder returns a payment order by ID.
func (h *PaymentHandler) GetOrder(c *web.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return errcode.ErrUnauthorized
	}

	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return errcode.ErrOrderNotFound
	}

	order, err := h.paymentUsecase.GetOrder(c.Request().Context(), orderID)
	if err != nil {
		return err
	}

	// Ensure user can only access their own orders
	if order.UserID != user.ID {
		return errcode.ErrOrderNotFound
	}

	return c.Success(order)
}

// ListOrders returns paginated payment orders for the current user.
func (h *PaymentHandler) ListOrders(c *web.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return errcode.ErrUnauthorized
	}

	req := &domain.ListOrderReq{
		Cursor: c.QueryParam("cursor"),
		Status: c.QueryParam("status"),
	}

	if l := c.QueryParam("limit"); l != "" {
		if parsed, e := uuid.Parse(l); e == nil {
			_ = parsed // limit is a number, not uuid; use strconv
		}
		// Simple int parsing for limit
		var limit int
		if _, err := fmt.Sscanf(l, "%d", &limit); err == nil && limit > 0 {
			req.Limit = limit
		}
	}

	resp, err := h.paymentUsecase.ListOrders(c.Request().Context(), user.ID, req)
	if err != nil {
		h.logger.Error("failed to list payment orders", "error", err, "user_id", user.ID)
		return err
	}
	return c.Success(resp)
}

// CancelOrder cancels a pending order.
func (h *PaymentHandler) CancelOrder(c *web.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return errcode.ErrUnauthorized
	}

	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return errcode.ErrOrderNotFound
	}

	// Verify ownership
	order, err := h.paymentUsecase.GetOrder(c.Request().Context(), orderID)
	if err != nil {
		return err
	}
	if order.UserID != user.ID {
		return errcode.ErrOrderNotFound
	}

	if err := h.paymentUsecase.CancelOrder(c.Request().Context(), orderID); err != nil {
		h.logger.Error("failed to cancel payment order", "error", err, "order_id", orderID)
		return err
	}
	return c.Success(nil)
}

// HandleCallback processes payment provider callbacks (WeChat Pay, etc.).
// This endpoint does NOT require authentication — it's called by the payment provider.
func (h *PaymentHandler) HandleCallback(c *web.Context) error {
	provider := c.Param("provider")

	// Read raw body for signature verification
	body := c.Request().Body
	defer body.Close()

	buf := make([]byte, 0, 4096)
	_, _ = body.Read(buf)

	if err := h.paymentUsecase.HandleCallback(c.Request().Context(), provider, buf); err != nil {
		h.logger.Error("failed to handle payment callback",
			"error", err,
			"provider", provider,
		)
		// Return success to provider to avoid retries on business logic errors
	}

	return c.Success(nil)
}
