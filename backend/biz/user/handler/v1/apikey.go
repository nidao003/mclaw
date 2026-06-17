package v1

import (
	"log/slog"

	"github.com/GoYoko/web"
	"github.com/google/uuid"
	"github.com/samber/do"

	"github.com/nidao003/mclaw/backend/domain"
	"github.com/nidao003/mclaw/backend/errcode"
	"github.com/nidao003/mclaw/backend/middleware"
)

// ApiKeyHandler handles API key management endpoints.
type ApiKeyHandler struct {
	usecase domain.ApiKeyUsecase
	logger  *slog.Logger
}

// NewApiKeyHandler creates and registers API key route handlers.
func NewApiKeyHandler(i *do.Injector) (*ApiKeyHandler, error) {
	w := do.MustInvoke[*web.Web](i)
	logger := do.MustInvoke[*slog.Logger](i)
	auth := do.MustInvoke[*middleware.AuthMiddleware](i)
	targetActive := do.MustInvoke[*middleware.TargetActiveMiddleware](i)
	uc := do.MustInvoke[domain.ApiKeyUsecase](i)

	h := &ApiKeyHandler{
		usecase: uc,
		logger:  logger.With("module", "apikey.handler"),
	}

	// API Key 管理路由 —— 需要 session 登录
	keys := w.Group("/api/v1/user/api-keys", auth.Auth(), targetActive.TargetActive())
	keys.GET("", web.BaseHandler(h.ListKeys))
	keys.POST("", web.BindHandler(h.CreateKey))
	keys.DELETE("/:id", web.BaseHandler(h.RevokeKey))

	return h, nil
}

// ListKeys 列出当前用户的所有 API keys.
func (h *ApiKeyHandler) ListKeys(c *web.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return errcode.ErrUnauthorized
	}

	keys, err := h.usecase.List(c.Request().Context(), user.ID)
	if err != nil {
		return err
	}
	return c.Success(&domain.ListApiKeyResp{Keys: keys})
}

// CreateKey 创建一个新的 API key（返回完整明文，仅此一次）.
func (h *ApiKeyHandler) CreateKey(c *web.Context, req domain.CreateApiKeyReq) error {
	user := middleware.GetUser(c)
	if user == nil {
		return errcode.ErrUnauthorized
	}

	resp, err := h.usecase.Create(c.Request().Context(), user.ID, &req)
	if err != nil {
		h.logger.Error("failed to create api key", "error", err)
		return err
	}
	return c.Success(resp)
}

// RevokeKey 吊销一个 API key.
func (h *ApiKeyHandler) RevokeKey(c *web.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return errcode.ErrUnauthorized
	}

	keyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return errcode.ErrSkillNotFound // reuse generic not-found
	}

	if err := h.usecase.Revoke(c.Request().Context(), user.ID, keyID); err != nil {
		return err
	}
	return c.Success(nil)
}
