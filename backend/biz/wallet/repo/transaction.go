package repo

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/samber/do"
	"go.uber.org/zap"

	"entgo.io/ent/dialect/sql"

	"github.com/nidao003/mclaw/backend/consts"
	"github.com/nidao003/mclaw/backend/db"
	"github.com/nidao003/mclaw/backend/db/transactionlog"
	"github.com/nidao003/mclaw/backend/domain"
)

type transactionRepo struct {
	db  *db.Client
	log *zap.Logger
}

// NewTransactionRepo creates a new TransactionRepo instance.
func NewTransactionRepo(i *do.Injector) (domain.TransactionRepo, error) {
	dbClient := do.MustInvoke[*db.Client](i)
	logger := do.MustInvoke[*zap.Logger](i)
	return &transactionRepo{db: dbClient, log: logger}, nil
}

func (r *transactionRepo) Create(ctx context.Context, log *db.TransactionLog) (*db.TransactionLog, error) {
	builder := r.db.TransactionLog.Create().
		SetUserID(log.UserID).
		SetKind(log.Kind).
		SetInoutType(log.InoutType).
		SetAmount(log.Amount).
		SetBalance(log.Balance)

	if log.Remark != "" {
		builder.SetRemark(log.Remark)
	}
	if log.SourceID != "" {
		builder.SetSourceID(log.SourceID)
	}

	result, err := builder.Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create transaction log: %w", err)
	}
	return result, nil
}

func (r *transactionRepo) ListByUserID(ctx context.Context, userID uuid.UUID, req *domain.ListTransactionReq) ([]*db.TransactionLog, int, error) {
	query := r.db.TransactionLog.Query().
		Where(transactionlog.UserIDEQ(userID))

	// Filter by kind if specified
	if req.Kind != "" {
		query.Where(transactionlog.KindEQ(consts.TransactionKind(req.Kind)))
	}

	// Default limit
	limit := req.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	query.Limit(limit)

	// Order by creation time descending
	query.Order(transactionlog.ByCreatedAt(sql.OrderDesc()))

	// Cursor-based pagination
	if req.Cursor != "" {
		cursorID, err := uuid.Parse(req.Cursor)
		if err == nil {
			query.Where(transactionlog.IDLT(cursorID))
		}
	}

	items, err := query.All(ctx)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list transactions: %w", err)
	}

	return items, len(items), nil
}
