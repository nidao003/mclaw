package consts

type UserPlatform string

const (
	UserPlatformBaizhi UserPlatform = "baizhi" // 百智云平台
	UserPlatformGithub UserPlatform = "github"
	UserPlatformGitLab UserPlatform = "gitlab"
	UserPlatformGitea  UserPlatform = "gitea"
	UserPlatformGitee  UserPlatform = "gitee"
)

type UserStatus string

const (
	UserStatusActive   UserStatus = "active"
	UserStatusInactive UserStatus = "inactive"
	UserStatusBanded   UserStatus = "banded"
)

type UserRole string

const (
	UserRoleIndividual UserRole = "individual" // 个人用户（向后兼容 → 普通用户）
	UserRoleEnterprise UserRole = "enterprise" // 企业用户（向后兼容 → 等价发布者）
	UserRoleSubAccount UserRole = "subaccount" // 企业子账户
	UserRoleAdmin      UserRole = "admin"      // 超级管理员（向后兼容）
	UserRoleGitTask    UserRole = "gittask"    // Git Task 用户（全自动 git 任务插入的用户）

	// V2 新增角色
	UserRoleSuperAdmin UserRole = "super_admin" // 超级管理员（可分配角色）
	UserRoleReviewer   UserRole = "reviewer"    // 审核员
	UserRolePublisher  UserRole = "publisher"   // 技能上传者
	UserRoleUser       UserRole = "user"        // 普通注册用户（默认）
)

// RolePriority 返回角色优先级数值，方便做权限比较。
// 数值越大权限越高。
func (r UserRole) RolePriority() int {
	switch r {
	case UserRoleSuperAdmin, UserRoleAdmin:
		return 100
	case UserRoleReviewer:
		return 70
	case UserRolePublisher, UserRoleEnterprise:
		return 50
	case UserRoleUser, UserRoleIndividual, UserRoleSubAccount, UserRoleGitTask:
		return 10
	default:
		return 0
	}
}

// CanReview 判断角色是否有审核权限。
func (r UserRole) CanReview() bool {
	return r.RolePriority() >= 70
}

// CanPublish 判断角色是否有发布/上传技能权限。
func (r UserRole) CanPublish() bool {
	return r.RolePriority() >= 50
}

// CanManageUsers 判断角色是否能管理用户权限。
func (r UserRole) CanManageUsers() bool {
	return r.RolePriority() >= 100
}

type RedisKey string

const (
	UserActiveKey RedisKey = "monkeycode_ai:user:active"
)

type DefaultConfigType string

const (
	DefaultConfigTypeModel DefaultConfigType = "model"
	DefaultConfigTypeImage DefaultConfigType = "image"
	DefaultConfigTypeHost  DefaultConfigType = "host"
)
