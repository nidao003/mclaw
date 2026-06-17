package repo

import (
	"context"

	"github.com/google/uuid"
	"github.com/samber/do"
	"go.uber.org/zap"

	"github.com/nidao003/mclaw/backend/db"
	"github.com/nidao003/mclaw/backend/db/invitation"
	"github.com/nidao003/mclaw/backend/domain"
)

type invitationRepo struct {
	db  *db.Client
	log *zap.Logger
}

// NewInvitationRepo creates a new InvitationRepo instance.
func NewInvitationRepo(i *do.Injector) (domain.InvitationRepo, error) {
	dbClient := do.MustInvoke[*db.Client](i)
	logger := do.MustInvoke[*zap.Logger](i)
	return &invitationRepo{db: dbClient, log: logger}, nil
}

func (r *invitationRepo) ListByInviter(ctx context.Context, inviterID uuid.UUID) ([]*db.Invitation, error) {
	return r.db.Invitation.Query().
		Where(invitation.InviterIDEQ(inviterID)).
		All(ctx)
}

func (r *invitationRepo) Create(ctx context.Context, inv *db.Invitation) (*db.Invitation, error) {
	return r.db.Invitation.Create().
		SetInviterID(inv.InviterID).
		SetInviteeID(inv.InviteeID).
		SetReward(inv.Reward).
		Save(ctx)
}
