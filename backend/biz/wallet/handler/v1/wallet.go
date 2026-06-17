package v1

import (
	"fmt"
	"log/slog"

	"github.com/GoYoko/web"
	"github.com/samber/do"

	"github.com/nidao003/mclaw/backend/domain"
	"github.com/nidao003/mclaw/backend/errcode"
	"github.com/nidao003/mclaw/backend/middleware"
)

// WalletHandler handles wallet/credit-related API endpoints.
type WalletHandler struct {
	walletUsecase  domain.WalletUsecase
	invitationRepo domain.InvitationRepo
	logger         *slog.Logger
}

// NewWalletHandler creates and registers wallet route handlers.
func NewWalletHandler(i *do.Injector) (*WalletHandler, error) {
	w := do.MustInvoke[*web.Web](i)
	logger := do.MustInvoke[*slog.Logger](i)
	auth := do.MustInvoke[*middleware.AuthMiddleware](i)
	targetActive := do.MustInvoke[*middleware.TargetActiveMiddleware](i)
	walletUC := do.MustInvoke[domain.WalletUsecase](i)
	invRepo := do.MustInvoke[domain.InvitationRepo](i)

	h := &WalletHandler{
		walletUsecase:  walletUC,
		invitationRepo: invRepo,
		logger:         logger.With("module", "wallet.handler"),
	}

	// Wallet routes (require auth)
	users := w.Group("/api/v1/users")
	users.GET("/wallet", web.BaseHandler(h.GetWallet), auth.Auth(), targetActive.TargetActive())
	users.GET("/wallet/checkin", web.BaseHandler(h.GetCheckInStatus), auth.Auth(), targetActive.TargetActive())
	users.POST("/wallet/checkin", web.BindHandler(h.CheckIn), auth.Auth(), targetActive.TargetActive())
	users.POST("/wallet/exchange", web.BindHandler(h.Exchange), auth.Auth(), targetActive.TargetActive())
	users.POST("/wallet/recharge", web.BindHandler(h.Recharge), auth.Auth(), targetActive.TargetActive())
	users.GET("/wallet/transaction", web.BaseHandler(h.ListTransactions), auth.Auth(), targetActive.TargetActive())
	users.GET("/invitations", web.BaseHandler(h.ListInvitations), auth.Auth(), targetActive.TargetActive())

	return h, nil
}

// GetWallet returns the wallet balance and daily token quotas.
func (h *WalletHandler) GetWallet(c *web.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return errcode.ErrUnauthorized
	}

	wallet, err := h.walletUsecase.Get(c.Request().Context(), user.ID)
	if err != nil {
		h.logger.Error("failed to get wallet", "error", err, "user_id", user.ID)
		return err
	}
	return c.Success(wallet)
}

// GetCheckInStatus returns whether the user has checked in today.
func (h *WalletHandler) GetCheckInStatus(c *web.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return errcode.ErrUnauthorized
	}

	resp, err := h.walletUsecase.GetCheckInStatus(c.Request().Context(), user.ID)
	if err != nil {
		return err
	}
	return c.Success(resp)
}

// CheckIn performs daily check-in.
func (h *WalletHandler) CheckIn(c *web.Context, req *domain.CheckInReq) error {
	user := middleware.GetUser(c)
	if user == nil {
		return errcode.ErrUnauthorized
	}

	resp, err := h.walletUsecase.CheckIn(c.Request().Context(), user.ID)
	if err != nil {
		h.logger.Error("failed to check in", "error", err, "user_id", user.ID)
		return err
	}
	return c.Success(resp)
}

// Exchange redeems an exchange code for credits.
func (h *WalletHandler) Exchange(c *web.Context, req *domain.ExchangeReq) error {
	user := middleware.GetUser(c)
	if user == nil {
		return errcode.ErrUnauthorized
	}

	if err := h.walletUsecase.Exchange(c.Request().Context(), user.ID, req); err != nil {
		h.logger.Error("failed to exchange code", "error", err, "user_id", user.ID)
		return err
	}
	return c.Success(nil)
}

// Recharge creates a recharge order (returns payment URL).
func (h *WalletHandler) Recharge(c *web.Context, req *domain.RechargeReq) error {
	user := middleware.GetUser(c)
	if user == nil {
		return errcode.ErrUnauthorized
	}

	resp, err := h.walletUsecase.Recharge(c.Request().Context(), user.ID, req)
	if err != nil {
		h.logger.Error("failed to recharge", "error", err, "user_id", user.ID)
		return err
	}
	return c.Success(resp)
}

// ListTransactions returns paginated transaction history.
func (h *WalletHandler) ListTransactions(c *web.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return errcode.ErrUnauthorized
	}

	req := &domain.ListTransactionReq{}
	req.Cursor = c.QueryParam("cursor")
	req.Limit = 20 // default limit
	if l := c.QueryParam("limit"); l != "" {
		if parsed, err := parseInt(l); err == nil && parsed > 0 && parsed <= 100 {
			req.Limit = parsed
		}
	}
	req.Kind = c.QueryParam("kind")

	resp, err := h.walletUsecase.ListTransactions(c.Request().Context(), user.ID, req)
	if err != nil {
		h.logger.Error("failed to list transactions", "error", err, "user_id", user.ID)
		return err
	}
	return c.Success(resp)
}

// ListInvitations returns the user's invitation list.
func (h *WalletHandler) ListInvitations(c *web.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return errcode.ErrUnauthorized
	}

	invs, err := h.invitationRepo.ListByInviter(c.Request().Context(), user.ID)
	if err != nil {
		h.logger.Error("failed to list invitations", "error", err, "user_id", user.ID)
		return err
	}

	items := make([]*domain.InvitationItem, 0, len(invs))
	for _, inv := range invs {
		items = append(items, &domain.InvitationItem{
			ID:        inv.ID,
			InviteeID: inv.InviteeID,
			Credits:   inv.Reward,
			InvitedAt: inv.CreatedAt.Unix(),
		})
	}

	return c.Success(&domain.InvitationListResp{
		Count: len(items),
		Items: items,
	})
}

// parseInt is a simple helper to parse an int from string.
func parseInt(s string) (int, error) {
	var n int
	for _, c := range s {
		if c < '0' || c > '9' {
			return 0, fmt.Errorf("invalid digit")
		}
		n = n*10 + int(c-'0')
	}
	return n, nil
}
