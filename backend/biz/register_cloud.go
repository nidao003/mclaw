//go:build !minimal

package biz

import (
	"github.com/samber/do"

	"github.com/nidao003/mclaw/backend/biz/git"
	"github.com/nidao003/mclaw/backend/biz/host"
	"github.com/nidao003/mclaw/backend/biz/project"
	"github.com/nidao003/mclaw/backend/biz/task"
	"github.com/nidao003/mclaw/backend/biz/team"
	"github.com/nidao003/mclaw/backend/biz/vmidle"
)

// RegisterCloud 注册云开发模块（host/vmidle/task/git/project/team）
// 仅在非 minimal 构建时启用
func RegisterCloud(i *do.Injector) error {
	team.ProvideTeam(i)
	host.ProvideHost(i)
	task.ProvideTask(i)
	git.ProvideGit(i)
	project.ProvideProject(i)
	vmidle.ProvideVMIdle(i)
	return nil
}

// InvokeCloud 激活云开发模块
func InvokeCloud(i *do.Injector) {
	team.InvokeTeam(i)
	host.InvokeHost(i)
	task.InvokeTask(i)
	git.InvokeGit(i)
	project.InvokeProject(i)
	vmidle.InvokeVMIdle(i)
}
