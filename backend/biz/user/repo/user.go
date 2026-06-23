package repo

import (
	"context"
	"log/slog"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/samber/do"

	"github.com/nidao003/mclaw/backend/config"
	"github.com/nidao003/mclaw/backend/consts"
	"github.com/nidao003/mclaw/backend/db"
	"github.com/nidao003/mclaw/backend/db/notifychannel"
	"github.com/nidao003/mclaw/backend/db/user"
	"github.com/nidao003/mclaw/backend/domain"
	"github.com/nidao003/mclaw/backend/errcode"
	"github.com/nidao003/mclaw/backend/pkg/crypto"
)

type userRepo struct {
	db     *db.Client
	logger *slog.Logger
	redis  *redis.Client
	config *config.Config
}

func NewUserRepo(i *do.Injector) (domain.UserRepo, error) {
	return &userRepo{
		db:     do.MustInvoke[*db.Client](i),
		logger: do.MustInvoke[*slog.Logger](i),
		redis:  do.MustInvoke[*redis.Client](i),
		config: do.MustInvoke[*config.Config](i),
	}, nil
}

// Get implements domain.UserRepo.
func (u *userRepo) Get(ctx context.Context, uid uuid.UUID) (*db.User, error) {
	return u.db.User.Get(ctx, uid)
}

// Update implements domain.UserRepo.
func (u *userRepo) Update(ctx context.Context, uid uuid.UUID, name, avatarURL string) error {
	update := u.db.User.UpdateOneID(uid)
	if name != "" {
		update = update.SetName(name)
	}
	if avatarURL != "" {
		update = update.SetAvatarURL(avatarURL)
	}
	return update.Exec(ctx)
}

// GetUserWithTeams implements domain.UserRepo.
func (u *userRepo) GetUserWithTeams(ctx context.Context, userID uuid.UUID) (*db.User, error) {
	return u.db.User.Query().
		Where(user.IDEQ(userID)).
		WithTeamMembers(func(q *db.TeamMemberQuery) {
			q.WithTeam()
		}).
		WithTeams().
		First(ctx)
}

// WechatMPBound implements domain.UserRepo.
func (u *userRepo) WechatMPBound(ctx context.Context, uid uuid.UUID) (bool, error) {
	return u.db.NotifyChannel.Query().
		Where(
			notifychannel.OwnerIDEQ(uid),
			notifychannel.OwnerTypeEQ(consts.NotifyOwnerUser),
			notifychannel.KindEQ(consts.NotifyChannelWechatMP),
			notifychannel.EnabledEQ(true),
		).
		Exist(ctx)
}

// PasswordLogin implements domain.UserRepo.
func (u *userRepo) PasswordLogin(ctx context.Context, req *domain.TeamLoginReq) (*db.User, error) {
	usr, err := u.db.User.Query().
		Where(user.EmailEQ(req.Email)).
		WithTeamMembers(func(q *db.TeamMemberQuery) {
			q.WithTeam()
		}).
		WithTeams().
		First(ctx)
	if err != nil {
		return nil, errcode.ErrLoginFailed.Wrap(err)
	}

	err = crypto.VerifyPassword(usr.Password, req.Password)
	if err != nil {
		u.logger.Error("invalid password", "email", req.Email, "error", err)
		return nil, errcode.ErrLoginFailed
	}
	return usr, nil
}

// ChangePassword implements domain.UserRepo.
func (u *userRepo) ChangePassword(ctx context.Context, userID uuid.UUID, currentPassword, newPassword string, isReset bool) error {
	uu, err := u.db.User.Query().Where(user.IDEQ(userID)).First(ctx)
	if err != nil {
		return errcode.ErrDatabaseQuery.Wrap(err)
	}

	if !isReset && uu.Password != "" {
		err = crypto.VerifyPassword(uu.Password, currentPassword)
		if err != nil {
			return errcode.ErrInvalidPassword.Wrap(err)
		}
	}

	hashedNewPassword, err := crypto.HashPassword(newPassword)
	if err != nil {
		return errcode.ErrLoginFailed.Wrap(err)
	}
	err = u.db.User.UpdateOneID(userID).
		SetPassword(hashedNewPassword).
		Exec(ctx)
	if err != nil {
		return errcode.ErrDatabaseOperation.Wrap(err)
	}
	return nil
}

// GetUserByEmail implements domain.UserRepo.
func (u *userRepo) GetUserByEmail(ctx context.Context, emails []string) ([]*db.User, error) {
	return u.db.User.Query().WithTeams().Where(user.EmailIn(emails...)).All(ctx)
}

// SetEmail implements domain.UserRepo.
func (u *userRepo) SetEmail(ctx context.Context, userID uuid.UUID, email string) error {
	return u.db.User.UpdateOneID(userID).SetEmail(email).Exec(ctx)
}

// ListUsers implements domain.UserRepo.
// 返回用户列表（管理后台专用），支持按搜索关键词和角色过滤。
func (u *userRepo) ListUsers(ctx context.Context, req *domain.AdminUserListReq) ([]*domain.AdminUserListItem, int, error) {
	query := u.db.User.Query()

	// 按角色过滤
	if req.Role != "" {
		query = query.Where(user.RoleEQ(consts.UserRole(req.Role)))
	}

	// 按名称或邮箱搜索
	if req.Search != "" {
		query = query.Where(
			user.Or(
				user.NameContains(req.Search),
				user.EmailContains(req.Search),
			),
		)
	}

	// 获取总数
	total, err := query.Count(ctx)
	if err != nil {
		return nil, 0, errcode.ErrDatabaseQuery.Wrap(err)
	}

	// 分页
	limit := req.Limit
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	query = query.Limit(limit).Order(db.Asc(user.FieldID))

	// 游标分页
	if req.Cursor != "" {
		cursorID, err := uuid.Parse(req.Cursor)
		if err == nil {
			query = query.Where(user.IDGTE(cursorID))
		}
	}

	users, err := query.All(ctx)
	if err != nil {
		return nil, 0, errcode.ErrDatabaseQuery.Wrap(err)
	}

	items := make([]*domain.AdminUserListItem, 0, len(users))
	for _, usr := range users {
		items = append(items, &domain.AdminUserListItem{
			ID:        usr.ID,
			Name:      usr.Name,
			Email:     usr.Email,
			AvatarURL: usr.AvatarURL,
			Role:      string(usr.Role),
			Status:    string(usr.Status),
			CreatedAt: usr.CreatedAt,
		})
	}

	return items, total, nil
}

// UpdateRole implements domain.UserRepo.
// 修改用户角色。
func (u *userRepo) UpdateRole(ctx context.Context, userID uuid.UUID, role string) error {
	return u.db.User.UpdateOneID(userID).
		SetRole(consts.UserRole(role)).
		Exec(ctx)
}
