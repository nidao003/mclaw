package repo

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/samber/do"
	"go.uber.org/zap"

	"github.com/nidao003/mclaw/backend/db"
	"github.com/nidao003/mclaw/backend/db/checkin"
	"github.com/nidao003/mclaw/backend/domain"
)

type checkInRepo struct {
	db  *db.Client
	log *zap.Logger
}

// NewCheckInRepo creates a new CheckInRepo instance.
func NewCheckInRepo(i *do.Injector) (domain.CheckInRepo, error) {
	dbClient := do.MustInvoke[*db.Client](i)
	logger := do.MustInvoke[*zap.Logger](i)
	return &checkInRepo{db: dbClient, log: logger}, nil
}

func (r *checkInRepo) GetByUserAndDate(ctx context.Context, userID uuid.UUID, date time.Time) (*db.CheckIn, error) {
	// Query for check-in on the same date (compare year/month/day only)
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	return r.db.CheckIn.Query().
		Where(
			checkin.UserIDEQ(userID),
			checkin.CheckedAtGTE(startOfDay),
			checkin.CheckedAtLT(endOfDay),
		).
		Only(ctx)
}

func (r *checkInRepo) Create(ctx context.Context, c *db.CheckIn) (*db.CheckIn, error) {
	result, err := r.db.CheckIn.Create().
		SetUserID(c.UserID).
		SetCheckedAt(c.CheckedAt).
		SetReward(c.Reward).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create check-in: %w", err)
	}
	return result, nil
}
