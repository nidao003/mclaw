package team

import (
	"context"
	"fmt"

	"github.com/nidao003/mclaw/backend/domain"
)

// NoopMemberManager 空实现，mclaw 中不需要外部成员管理
type NoopMemberManager struct{}

func (n *NoopMemberManager) AddUser(ctx context.Context, teamUser *domain.TeamUser, req *domain.AddTeamUserReq) (*domain.AddTeamUserResp, error) {
	return nil, fmt.Errorf("member management not supported in mclaw")
}

func (n *NoopMemberManager) AddUserWithPassword(ctx context.Context, teamUser *domain.TeamUser, req *domain.AddTeamUserReq) (*domain.AddTeamUserWithPasswordResp, error) {
	return nil, fmt.Errorf("member management not supported in mclaw")
}

func (n *NoopMemberManager) AddAdmin(ctx context.Context, teamUser *domain.TeamUser, req *domain.AddTeamAdminReq) (*domain.AddTeamAdminResp, error) {
	return nil, fmt.Errorf("member management not supported in mclaw")
}

var _ domain.MemberManager = &NoopMemberManager{}
