//go:build minimal

package biz

import (
	"github.com/samber/do"

	"github.com/nidao003/mclaw/backend/biz/team/repo"
	"github.com/nidao003/mclaw/backend/biz/team/usecase"
)

// RegisterCloud minimal 构建：只注册 auth handler 依赖的 team 基础服务
func RegisterCloud(i *do.Injector) error {
	// 仅注册 TeamGroupUser 相关（auth handler 登录需要）
	// 不注册 TeamHost/TeamPolicy 等依赖云开发模块的服务
	do.Provide(i, repo.NewTeamGroupUserRepo)
	do.Provide(i, repo.NewAuditRepo)
	do.Provide(i, repo.NewTeamDashboardRepo)
	do.Provide(i, usecase.NewTeamGroupUserUsecase)
	do.Provide(i, usecase.NewAuditUsecase)
	do.Provide(i, usecase.NewTeamDashboardUsecase)
	return nil
}

// InvokeCloud minimal 构建：不激活 cloud handler
func InvokeCloud(i *do.Injector) {
	// minimal 模式不激活任何 cloud handler
}
