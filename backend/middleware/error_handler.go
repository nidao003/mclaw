package middleware

import (
	"github.com/GoYoko/web"
	"github.com/labstack/echo/v4"

	"github.com/nidao003/mclaw/backend/errcode"
)

// RegisterErrorHandler 注册自定义 echo HTTPErrorHandler。
// 背景：handler 路径走 web.BaseHandler→ctx.Failed，能正确把 *web.Err 还原成标准 envelope；
// 但中间件（如数据 API 计费）裸 return *web.Err 时会绕过 ctx.Failed，落到 echo 默认处理器吐 500，
// 丢失 402/403/503 等业务状态码。这里统一兜底：*web.Err 用其 Status + 业务码写回标准 Resp，
// 其余错误（echo.HTTPError 等）交给 echo 默认处理。
func RegisterErrorHandler(w *web.Web) {
	e := w.Echo()
	e.HTTPErrorHandler = func(err error, c echo.Context) {
		if c.Response().Committed {
			return
		}
		if status, code, msg, ok := errcode.EncodeErr(err); ok {
			_ = c.JSON(status, web.Resp{Code: code, Message: msg})
			return
		}
		e.DefaultHTTPErrorHandler(err, c)
	}
}
