package middleware

import (
	"os"
	"strings"

	"github.com/GoYoko/web"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

// 允许的 CORS origins，逗号分隔，可通过环境变量 CORS_ORIGINS 配置
func getAllowedOrigins() []string {
	if v := os.Getenv("CORS_ORIGINS"); v != "" {
		return strings.Split(v, ",")
	}
	// 默认：开发环境 Web 前端 + localhost
	return []string{
		"http://localhost:5174",
		"http://127.0.0.1:5174",
		"http://localhost:3000",
		"http://localhost:5173",
	}
}

// RegisterCORS 给 web 实例注册 CORS 中间件
// 必须在路由注册之前调用
func RegisterCORS(w *web.Web) {
	e := w.Echo()
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins:     getAllowedOrigins(),
		AllowMethods:     []string{echo.GET, echo.POST, echo.PUT, echo.DELETE, echo.PATCH, echo.OPTIONS},
		AllowHeaders:     []string{echo.HeaderContentType, echo.HeaderAuthorization, echo.HeaderXRequestID},
		AllowCredentials: true,
		MaxAge:           86400,
	}))
}
