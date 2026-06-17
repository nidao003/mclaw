package v1

import (
	"log/slog"

	"github.com/GoYoko/web"
	"github.com/samber/do"

	"github.com/nidao003/mclaw/backend/domain"
	"github.com/nidao003/mclaw/backend/errcode"
	"github.com/nidao003/mclaw/backend/middleware"
)

// SubscriptionHandler handles subscription-related API endpoints.
type SubscriptionHandler struct {
	subUsecase domain.SubscriptionUsecase
	planUsecase domain.PlanUsecase
	logger     *slog.Logger
}

// NewSubscriptionHandler creates and registers subscription route handlers.
func NewSubscriptionHandler(i *do.Injector) (*SubscriptionHandler, error) {
	w := do.MustInvoke[*web.Web](i)
	logger := do.MustInvoke[*slog.Logger](i)
	auth := do.MustInvoke[*middleware.AuthMiddleware](i)
	targetActive := do.MustInvoke[*middleware.TargetActiveMiddleware](i)
	subUC := do.MustInvoke[domain.SubscriptionUsecase](i)
	planUC := do.MustInvoke[domain.PlanUsecase](i)

	h := &SubscriptionHandler{
		subUsecase:  subUC,
		planUsecase: planUC,
		logger:      logger.With("module", "subscription.handler"),
	}

	// User-facing subscription routes (require auth)
	users := w.Group("/api/v1/users")
	users.GET("/subscription", web.BaseHandler(h.Get), auth.Auth(), targetActive.TargetActive())
	users.POST("/subscription", web.BindHandler(h.Subscribe), auth.Auth(), targetActive.TargetActive())
	users.PUT("/subscription/auto-renew", web.BindHandler(h.ToggleAutoRenew), auth.Auth(), targetActive.TargetActive())
	users.PUT("/subscription/credit-consumption", web.BindHandler(h.ToggleCreditConsumption), auth.Auth(), targetActive.TargetActive())

	// Public plan listing
	w.GET("/api/v1/plans", web.BaseHandler(h.ListPlans))

	return h, nil
}

// Get returns the current subscription for the authenticated user.
//
//	@Summary		Query current subscription
//	@Description	Returns the user's active subscription status
//	@Tags			Subscription
//	@Accept			json
//	@Produce		json
//	@Security		MonkeyCodeAIAuth
//	@Success		200	{object}	web.Resp{data=domain.SubscriptionResp}
//	@Failure		401	{object}	web.Resp
//	@Router			/api/v1/users/subscription [get]
func (h *SubscriptionHandler) Get(c *web.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return errcode.ErrUnauthorized
	}

	resp, err := h.subUsecase.Get(c.Request().Context(), user.ID)
	if err != nil {
		h.logger.Error("failed to get subscription", "error", err, "user_id", user.ID)
		return err
	}
	return c.Success(resp)
}

// Subscribe creates or upgrades a subscription.
//
//	@Summary		Subscribe to a plan
//	@Description	Subscribe or upgrade to a paid plan
//	@Tags			Subscription
//	@Accept			json
//	@Produce		json
//	@Security		MonkeyCodeAIAuth
//	@Param			req	body		domain.SubscribeReq	true	"Subscribe request"
//	@Success		200	{object}	web.Resp{data=domain.SubscriptionResp}
//	@Failure		401	{object}	web.Resp
//	@Router			/api/v1/users/subscription [post]
func (h *SubscriptionHandler) Subscribe(c *web.Context, req *domain.SubscribeReq) error {
	user := middleware.GetUser(c)
	if user == nil {
		return errcode.ErrUnauthorized
	}

	resp, err := h.subUsecase.Subscribe(c.Request().Context(), user.ID, req)
	if err != nil {
		h.logger.Error("failed to subscribe", "error", err, "user_id", user.ID)
		return err
	}
	return c.Success(resp)
}

// ToggleAutoRenew switches auto-renewal on/off.
func (h *SubscriptionHandler) ToggleAutoRenew(c *web.Context, req *domain.AutoRenewReq) error {
	user := middleware.GetUser(c)
	if user == nil {
		return errcode.ErrUnauthorized
	}

	if err := h.subUsecase.ToggleAutoRenew(c.Request().Context(), user.ID, req); err != nil {
		h.logger.Error("failed to toggle auto-renew", "error", err, "user_id", user.ID)
		return err
	}
	return c.Success(nil)
}

// ToggleCreditConsumption switches credit consumption after quota exhaustion.
func (h *SubscriptionHandler) ToggleCreditConsumption(c *web.Context, req *domain.CreditConsumptionReq) error {
	user := middleware.GetUser(c)
	if user == nil {
		return errcode.ErrUnauthorized
	}

	if err := h.subUsecase.ToggleCreditConsumption(c.Request().Context(), user.ID, req); err != nil {
		h.logger.Error("failed to toggle credit consumption", "error", err, "user_id", user.ID)
		return err
	}
	return c.Success(nil)
}

// ListPlans returns all available subscription plans.
func (h *SubscriptionHandler) ListPlans(c *web.Context) error {
	plans, err := h.planUsecase.List(c.Request().Context())
	if err != nil {
		h.logger.Error("failed to list plans", "error", err)
		return err
	}
	return c.Success(plans)
}
