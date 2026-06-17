package repo

import (
	"context"

	"github.com/google/uuid"
	"github.com/samber/do"
	"go.uber.org/zap"

	"github.com/nidao003/mclaw/backend/db"
	"github.com/nidao003/mclaw/backend/db/exchangecode"
	"github.com/nidao003/mclaw/backend/domain"
)

type exchangeCodeRepo struct {
	db  *db.Client
	log *zap.Logger
}

// NewExchangeCodeRepo creates a new ExchangeCodeRepo instance.
func NewExchangeCodeRepo(i *do.Injector) (domain.ExchangeCodeRepo, error) {
	dbClient := do.MustInvoke[*db.Client](i)
	logger := do.MustInvoke[*zap.Logger](i)
	return &exchangeCodeRepo{db: dbClient, log: logger}, nil
}

func (r *exchangeCodeRepo) GetByCode(ctx context.Context, code string) (*db.ExchangeCode, error) {
	return r.db.ExchangeCode.Query().
		Where(
			exchangecode.CodeEQ(code),
			exchangecode.IsActiveEQ(true),
		).
		Only(ctx)
}

func (r *exchangeCodeRepo) IncrementUsedCount(ctx context.Context, id uuid.UUID) error {
	ec, err := r.db.ExchangeCode.Get(ctx, id)
	if err != nil {
		return err
	}
	_, err = r.db.ExchangeCode.UpdateOneID(id).
		SetUsedCount(ec.UsedCount + 1).
		Save(ctx)
	return err
}
