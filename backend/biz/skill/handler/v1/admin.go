package v1

import (
	"context"
	"log/slog"

	"github.com/GoYoko/web"
	"github.com/google/uuid"
	"github.com/samber/do"

	"github.com/nidao003/mclaw/backend/consts"
	"github.com/nidao003/mclaw/backend/domain"
	"github.com/nidao003/mclaw/backend/errcode"
	"github.com/nidao003/mclaw/backend/middleware"
	"github.com/nidao003/mclaw/backend/pkg/clickhouse"
)

// SkillAdminHandler Skills Hub 管理后台 API handler（V2 权限系统）。
type SkillAdminHandler struct {
	userRepo      domain.UserRepo
	subUsecase    domain.SubscriptionUsecase
	walletUsecase domain.WalletUsecase
	chClient      *clickhouse.Client
	logger        *slog.Logger
}

func NewSkillAdminHandler(i *do.Injector) (*SkillAdminHandler, error) {
	w := do.MustInvoke[*web.Web](i)
	logger := do.MustInvoke[*slog.Logger](i)
	auth := do.MustInvoke[*middleware.AuthMiddleware](i)
	userRepo := do.MustInvoke[domain.UserRepo](i)
	subUsecase := do.MustInvoke[domain.SubscriptionUsecase](i)
	walletUsecase := do.MustInvoke[domain.WalletUsecase](i)

	// clickhouse 可选 —— 未配置（如 133 测试环境）时 token 用量返回 0
	var chClient *clickhouse.Client
	if c, err := do.Invoke[*clickhouse.Client](i); err == nil {
		chClient = c
	}

	h := &SkillAdminHandler{
		userRepo:      userRepo,
		subUsecase:    subUsecase,
		walletUsecase: walletUsecase,
		chClient:      chClient,
		logger:        logger.With("module", "skill-admin.handler"),
	}

	// 管理员路由组 —— 需要认证 + 超级管理员权限
	adminGroup := w.Group("/api/v1/admin", auth.Auth(), middleware.RequireSuperAdmin())
	adminGroup.GET("/users", web.BaseHandler(h.ListUsers))
	adminGroup.PUT("/users/:id/role", web.BaseHandler(h.UpdateUserRole))

	return h, nil
}

// ListUsers 返回用户列表（超级管理员专用）。
func (h *SkillAdminHandler) ListUsers(c *web.Context) error {
	ctx := c.Request().Context()
	req := &domain.AdminUserListReq{Limit: 20}
	req.Cursor = c.QueryParam("cursor")
	req.Search = c.QueryParam("search")
	req.Role = c.QueryParam("role")
	if l := c.QueryParam("limit"); l != "" {
		if n, err := parseInt(l); err == nil && n > 0 && n <= 100 {
			req.Limit = n
		}
	}
	users, total, err := h.userRepo.ListUsers(ctx, req)
	if err != nil {
		h.logger.Error("failed to list users", "error", err)
		return err
	}

	// 填充订阅套餐、积分余额、token 消耗
	for _, u := range users {
		h.enrichUser(ctx, u)
	}

	return c.Success(map[string]any{"users": users, "total": total})
}

// enrichUser 补充用户的订阅/积分/token 字段（任何子查询失败都优雅降级）
func (h *SkillAdminHandler) enrichUser(ctx context.Context, u *domain.AdminUserListItem) {
	if h.subUsecase != nil {
		if sub, err := h.subUsecase.Get(ctx, u.ID); err == nil && sub != nil {
			u.PlanName = sub.Plan
		}
	}
	if h.walletUsecase != nil {
		if w, err := h.walletUsecase.Get(ctx, u.ID); err == nil && w != nil {
			u.Balance = w.Balance
		}
	}
	if h.chClient != nil {
		if total, err := h.chClient.QueryUserTokenUsage(ctx, u.ID.String()); err == nil {
			u.TokensUsed = total
		}
	}
}

// UpdateUserRole 修改用户角色（超级管理员专用）。
func (h *SkillAdminHandler) UpdateUserRole(c *web.Context) error {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return errcode.ErrInvalidParameter
	}
	var req domain.AdminUpdateUserRoleReq
	if err := decodeJSONBody(c, &req); err != nil {
		return errcode.ErrInvalidParameter
	}
	// 校验角色合法性：允许分配所有已知角色（含 V1 旧角色）
	validRoles := map[string]bool{
		string(consts.UserRoleSuperAdmin): true,
		string(consts.UserRoleAdmin):      true,
		string(consts.UserRoleReviewer):   true,
		string(consts.UserRolePublisher):  true,
		string(consts.UserRoleEnterprise): true,
		string(consts.UserRoleUser):       true,
	}
	if !validRoles[req.Role] {
		return errcode.ErrInvalidParameter
	}
	if err := h.userRepo.UpdateRole(c.Request().Context(), userID, req.Role); err != nil {
		h.logger.Error("failed to update user role", "error", err, "user_id", userID, "role", req.Role)
		return err
	}
	return c.Success(nil)
}