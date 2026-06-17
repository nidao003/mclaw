package v1

import (
	"log/slog"

	"github.com/GoYoko/web"
	"github.com/google/uuid"
	"github.com/samber/do"

	"github.com/nidao003/mclaw/backend/consts"
	"github.com/nidao003/mclaw/backend/domain"
	"github.com/nidao003/mclaw/backend/errcode"
	"github.com/nidao003/mclaw/backend/middleware"
)

// SkillAdminHandler Skills Hub 管理后台 API handler（V2 权限系统）。
type SkillAdminHandler struct {
	userRepo domain.UserRepo
	logger   *slog.Logger
}

func NewSkillAdminHandler(i *do.Injector) (*SkillAdminHandler, error) {
	w := do.MustInvoke[*web.Web](i)
	logger := do.MustInvoke[*slog.Logger](i)
	auth := do.MustInvoke[*middleware.AuthMiddleware](i)
	userRepo := do.MustInvoke[domain.UserRepo](i)

	h := &SkillAdminHandler{userRepo: userRepo, logger: logger.With("module", "skill-admin.handler")}

	// 管理员路由组 —— 需要认证 + 超级管理员权限
	adminGroup := w.Group("/api/v1/admin", auth.Auth(), middleware.RequireSuperAdmin())
	adminGroup.GET("/users", web.BaseHandler(h.ListUsers))
	adminGroup.PUT("/users/:id/role", web.BaseHandler(h.UpdateUserRole))

	return h, nil
}

// ListUsers 返回用户列表（超级管理员专用）。
func (h *SkillAdminHandler) ListUsers(c *web.Context) error {
	req := &domain.AdminUserListReq{Limit: 20}
	req.Cursor = c.QueryParam("cursor")
	req.Search = c.QueryParam("search")
	req.Role = c.QueryParam("role")
	if l := c.QueryParam("limit"); l != "" {
		if n, err := parseInt(l); err == nil && n > 0 && n <= 100 {
			req.Limit = n
		}
	}
	users, total, err := h.userRepo.ListUsers(c.Request().Context(), req)
	if err != nil {
		h.logger.Error("failed to list users", "error", err)
		return err
	}
	return c.Success(map[string]any{"users": users, "total": total})
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
