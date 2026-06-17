package middleware

import (
	"log/slog"
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/nidao003/mclaw/backend/domain"
)

// AdminAuth requires the authenticated user to have admin role.
// Must be used AFTER Auth() middleware (which sets the user in context).
func AdminAuth(adminToken string, logger *slog.Logger) echo.MiddlewareFunc {
	log := logger.With("module", "AdminAuth")
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Check admin token in header (for API access)
			if adminToken != "" {
				token := c.Request().Header.Get("X-Admin-Token")
				if token == adminToken {
					return next(c)
				}
			}

			// Check if authenticated user has admin role
			user := GetUser(c)
			if user == nil {
				log.Warn("admin access denied: no user in context")
				return c.String(http.StatusForbidden, "Forbidden")
			}

			if !isAdminUser(user) {
				log.Warn("admin access denied: user is not admin",
					"user_id", user.ID.String(),
					"email", user.Email,
				)
				return c.String(http.StatusForbidden, "Forbidden")
			}

			return next(c)
		}
	}
}

// isAdminUser checks if a user has admin privileges.
// Currently based on the admin_email config or role field.
func isAdminUser(user *domain.User) bool {
	if user == nil {
		return false
	}
	// Check role field (if set)
	if user.Role == "admin" {
		return true
	}
	return false
}
