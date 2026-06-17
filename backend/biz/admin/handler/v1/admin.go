package v1

import (
	"log/slog"

	"github.com/GoYoko/web"
	"github.com/google/uuid"
	"github.com/samber/do"

	"github.com/nidao003/mclaw/backend/config"
	"github.com/nidao003/mclaw/backend/consts"
	"github.com/nidao003/mclaw/backend/domain"
	"github.com/nidao003/mclaw/backend/errcode"
	"github.com/nidao003/mclaw/backend/middleware"
)

// AdminHandler handles admin API endpoints for management console.
type AdminHandler struct {
	subUC     domain.SubscriptionUsecase
	planUC    domain.PlanUsecase
	walletUC  domain.WalletUsecase
	paymentUC domain.PaymentUsecase
	logger    *slog.Logger
}

// NewAdminHandler creates and registers admin route handlers.
func NewAdminHandler(i *do.Injector) (*AdminHandler, error) {
	w := do.MustInvoke[*web.Web](i)
	logger := do.MustInvoke[*slog.Logger](i)
	auth := do.MustInvoke[*middleware.AuthMiddleware](i)
	cfg := do.MustInvoke[*config.Config](i)
	subUC := do.MustInvoke[domain.SubscriptionUsecase](i)
	planUC := do.MustInvoke[domain.PlanUsecase](i)
	walletUC := do.MustInvoke[domain.WalletUsecase](i)

	var paymentUC domain.PaymentUsecase
	if p, err := do.Invoke[domain.PaymentUsecase](i); err == nil {
		paymentUC = p
	}

	h := &AdminHandler{
		subUC:     subUC,
		planUC:    planUC,
		walletUC:  walletUC,
		paymentUC: paymentUC,
		logger:    logger.With("module", "admin.handler"),
	}

	adminAuth := middleware.AdminAuth(cfg.AdminToken, logger)

	// Admin routes (require auth + admin)
	admin := w.Group("/api/v1/admin", auth.Auth(), adminAuth)

	// Plan management
	admin.GET("/plans", web.BaseHandler(h.ListPlans))
	admin.POST("/plans", web.BindHandler(h.CreatePlan))
	admin.PUT("/plans/:id", web.BindHandler(h.UpdatePlan))

	// Subscription management
	admin.POST("/subscriptions/grant", web.BindHandler(h.GrantSubscription))

	// Wallet management
	admin.POST("/wallet/adjust", web.BindHandler(h.AdjustBalance))
	admin.POST("/wallet/freeze", web.BindHandler(h.FreezeWallet))
	admin.POST("/wallet/exchange-codes", web.BindHandler(h.GenerateExchangeCodes))

	return h, nil
}

// --- Plan Management ---

// ListPlans returns all plans (including inactive) for admin.
func (h *AdminHandler) ListPlans(c *web.Context) error {
	plans, err := h.planUC.List(c.Request().Context())
	if err != nil {
		h.logger.Error("failed to list plans", "error", err)
		return err
	}
	return c.Success(plans)
}

// CreatePlan creates a new subscription plan.
func (h *AdminHandler) CreatePlan(c *web.Context, req *domain.AdminCreatePlanReq) error {
	// TODO: delegate to PlanUsecase.Create (needs to be added)
	return c.Success(nil)
}

// UpdatePlan updates an existing plan.
func (h *AdminHandler) UpdatePlan(c *web.Context, req *domain.AdminUpdatePlanReq) error {
	planID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return errcode.ErrPlanNotFound
	}
	_ = planID // TODO: delegate to PlanUsecase.Update
	return c.Success(nil)
}

// --- Subscription Management ---

// GrantSubscription grants a subscription to a user (admin action).
func (h *AdminHandler) GrantSubscription(c *web.Context, req *domain.AdminGrantSubscriptionReq) error {
	_, err := h.subUC.Subscribe(c.Request().Context(), req.UserID, &domain.SubscribeReq{
		Plan:       req.Plan,
		PeriodUnit: req.PeriodUnit,
		PeriodCount: req.PeriodCount,
	})
	if err != nil {
		h.logger.Error("failed to grant subscription", "error", err, "user_id", req.UserID)
		return err
	}
	return c.Success(nil)
}

// --- Wallet Management ---

// AdjustBalance adjusts a user's credit balance (admin action).
func (h *AdminHandler) AdjustBalance(c *web.Context, req *domain.AdminAdjustBalanceReq) error {
	if req.Amount > 0 {
		if err := h.walletUC.Grant(c.Request().Context(), req.UserID, consts.TransactionDailyGrant, req.Amount, req.Remark, "admin"); err != nil {
			h.logger.Error("failed to adjust balance", "error", err, "user_id", req.UserID)
			return err
		}
	} else if req.Amount < 0 {
		if err := h.walletUC.Deduct(c.Request().Context(), req.UserID, consts.TransactionViolationFine, -req.Amount, req.Remark, "admin"); err != nil {
			h.logger.Error("failed to deduct balance", "error", err, "user_id", req.UserID)
			return err
		}
	}
	return c.Success(nil)
}

// FreezeWallet freezes or unfreezes a user's wallet.
func (h *AdminHandler) FreezeWallet(c *web.Context, req *domain.AdminFreezeWalletReq) error {
	// TODO: implement wallet freeze/unfreeze in wallet usecase
	h.logger.Info("wallet freeze/unfreeze requested", "user_id", req.UserID, "freeze", req.Freeze)
	return c.Success(nil)
}

// GenerateExchangeCodes batch-generates exchange codes.
func (h *AdminHandler) GenerateExchangeCodes(c *web.Context, req *domain.AdminGenerateExchangeCodesReq) error {
	// TODO: implement exchange code generation
	h.logger.Info("exchange codes generation requested", "credits", req.Credits, "count", req.Count)
	return c.Success(nil)
}
