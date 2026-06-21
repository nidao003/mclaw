package middleware

import (
	"fmt"
	"log/slog"
	"time"

	"github.com/GoYoko/web"
	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"
)

// RegisterLogging 给 web 实例注册 Recover + 请求/错误日志中间件。
// 必须在路由注册之前调用，且应最先注册（包住后续所有中间件/handler）。
// 作用：panic 不崩、handler 返回 error 时打出 path/method/status/err/堆栈，快速定位问题。
func RegisterLogging(w *web.Web, logger *slog.Logger) {
	e := w.Echo()

	// 1. Recover：捕获 panic，记日志 + 堆栈，返回 500
	e.Use(echomw.RecoverWithConfig(echomw.RecoverConfig{
		LogErrorFunc: func(c echo.Context, err error, stack []byte) error {
			logger.ErrorContext(c.Request().Context(), "PANIC recovered",
				"path", c.Path(),
				"method", c.Request().Method,
				"error", err.Error(),
				"stack", string(stack),
			)
			return err
		},
	}))

	// 2. 请求日志 + 错误日志中间件
	e.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			start := time.Now()
			req := c.Request()

			err := next(c)

			latency := time.Since(start)
			status := c.Response().Status

			// 只对出错请求（>=400）或数据 API 打详细日志，避免正常请求刷屏
			attrs := []any{
				"method", req.Method,
				"path", req.URL.Path,
				"uri", req.RequestURI,
				"status", status,
				"latency_ms", latency.Milliseconds(),
				"ip", c.RealIP(),
			}

			if err != nil {
				// handler 返回 error：打出错误详情
				attrs = append(attrs,
					"error", err.Error(),
					"error_type", fmt.Sprintf("%T", err),
					"error_verbose", fmt.Sprintf("%#v", err),
				)
				// echo.HTTPError 类型提取内部 message
				if he, ok := err.(*echo.HTTPError); ok {
					attrs = append(attrs, "http_code", he.Code, "http_message", fmt.Sprintf("%v", he.Message))
				}
				logger.ErrorContext(req.Context(), "request failed", attrs...)
			} else if status >= 400 {
				// 无 error 但状态码 >=400（如鉴权中间件直接 c.String）
				logger.WarnContext(req.Context(), "request non-2xx", attrs...)
			} else if logger.Enabled(req.Context(), slog.LevelDebug) {
				logger.DebugContext(req.Context(), "request ok", attrs...)
			}

			return err
		}
	})
}
