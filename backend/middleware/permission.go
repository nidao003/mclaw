package middleware

import (
	"log/slog"
	"net/http"

	"github.com/labstack/echo/v4"
)

// RequireRole 返回一个 Echo 中间件，要求当前用户持有 roles 中至少一个角色。
// 必须放在 Auth() 之后（依赖 GetUser）。
func RequireRole(roles ...string) echo.MiddlewareFunc {
	allowed := make(map[string]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			user := GetUser(c)
			if user == nil {
				return c.String(http.StatusForbidden, "Forbidden: authentication required")
			}
			if !allowed[string(user.Role)] {
				slog.Warn("permission denied",
					"user_id", user.ID.String(),
					"role", string(user.Role),
					"required", roles,
				)
				return c.String(http.StatusForbidden, "Forbidden: insufficient permissions")
			}
			return next(c)
		}
	}
}

// RequireReview 要求审核权限 (super_admin / admin / reviewer)
func RequireReview() echo.MiddlewareFunc {
	return RequireRole("super_admin", "admin", "reviewer")
}

// RequirePublish 要求发布权限 (super_admin / admin / reviewer / publisher / enterprise)
func RequirePublish() echo.MiddlewareFunc {
	return RequireRole("super_admin", "admin", "reviewer", "publisher", "enterprise")
}

// RequireSuperAdmin 要求超级管理员权限
func RequireSuperAdmin() echo.MiddlewareFunc {
	return RequireRole("super_admin", "admin")
}
