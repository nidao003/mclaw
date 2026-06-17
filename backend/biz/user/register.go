package user

import (
	"github.com/samber/do"

	"github.com/nidao003/mclaw/backend/domain"
	"github.com/nidao003/mclaw/backend/middleware"

	v1 "github.com/nidao003/mclaw/backend/biz/user/handler/v1"
	"github.com/nidao003/mclaw/backend/biz/user/repo"
	"github.com/nidao003/mclaw/backend/biz/user/usecase"
)

// ProvideUser 注册 user 模块的服务工厂
func ProvideUser(i *do.Injector) {
	do.Provide(i, repo.NewUserRepo)
	do.Provide(i, repo.NewUserActiveRepo)
	do.Provide(i, repo.NewApiKeyRepo)
	do.Provide(i, usecase.NewUserUsecase)
	do.Provide(i, usecase.NewApiKeyUsecase)
	do.Provide(i, v1.NewAuthHandler)
	do.Provide(i, v1.NewApiKeyHandler)
}

// InvokeUser 触发 user 模块的 handler 初始化
func InvokeUser(i *do.Injector) {
	do.MustInvoke[*v1.AuthHandler](i)
	do.MustInvoke[*v1.ApiKeyHandler](i)

	// 延迟注入 ApiKeyUsecase 到 AuthMiddleware
	auth := do.MustInvoke[*middleware.AuthMiddleware](i)
	apiKeyUC := do.MustInvoke[domain.ApiKeyUsecase](i)
	auth.InitApiKeyUsecase(apiKeyUC)
}
