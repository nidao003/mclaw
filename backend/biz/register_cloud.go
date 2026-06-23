//go:build !minimal

package biz

import (
	"github.com/samber/do"

	"github.com/nidao003/mclaw/backend/biz/team"
	"github.com/nidao003/mclaw/backend/domain"
)

// RegisterCloud 注册云开发模块
// mclaw 中仅注册 team 模块（团队用户/模型/分组管理）
// 其他模块（host/vmidle/task/git/project）需要额外外部依赖，暂不启用
func RegisterCloud(i *do.Injector) error {
	// 注册 MemberManager 空实现（mclaw 中不需要外部成员管理）
	do.ProvideValue[domain.MemberManager](i, &team.NoopMemberManager{})

	team.ProvideTeam(i)
	return nil
}

// InvokeCloud 激活云开发模块
func InvokeCloud(i *do.Injector) {
	team.InvokeTeam(i)
}
