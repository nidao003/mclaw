package repo

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/samber/do"
	"go.uber.org/zap"

	"github.com/nidao003/mclaw/backend/db"
	"github.com/nidao003/mclaw/backend/db/wallet"
	"github.com/nidao003/mclaw/backend/domain"
)

type walletRepo struct {
	db  *db.Client
	log *zap.Logger
}

// NewWalletRepo creates a new WalletRepo instance.
func NewWalletRepo(i *do.Injector) (domain.WalletRepo, error) {
	dbClient := do.MustInvoke[*db.Client](i)
	logger := do.MustInvoke[*zap.Logger](i)
	return &walletRepo{db: dbClient, log: logger}, nil
}

func (r *walletRepo) GetByUserID(ctx context.Context, userID uuid.UUID) (*db.Wallet, error) {
	return r.db.Wallet.Query().
		Where(wallet.UserIDEQ(userID)).
		Only(ctx)
}

func (r *walletRepo) Create(ctx context.Context, w *db.Wallet) (*db.Wallet, error) {
	result, err := r.db.Wallet.Create().
		SetID(uuid.New()).
		SetUserID(w.UserID).
		SetBalance(w.Balance).
		SetTotalRecharged(w.TotalRecharged).
		SetTotalConsumed(w.TotalConsumed).
		SetTotalGranted(w.TotalGranted).
		SetEnableCreditConsumption(w.EnableCreditConsumption).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create wallet: %w", err)
	}
	return result, nil
}

func (r *walletRepo) UpdateBalance(ctx context.Context, id uuid.UUID, balanceDelta, consumedDelta, grantedDelta int64) error {
	// Use Ent's AddX methods for atomic SQL increment/decrement (no read-then-write race)
	builder := r.db.Wallet.UpdateOneID(id).
		AddBalance(balanceDelta)

	if consumedDelta > 0 {
		builder.AddTotalConsumed(consumedDelta)
	}
	if grantedDelta > 0 {
		builder.AddTotalGranted(grantedDelta)
	}

	_, err := builder.Save(ctx)
	if err != nil {
		return fmt.Errorf("failed to update wallet balance: %w", err)
	}
	return nil
}

func (r *walletRepo) UpdateTokenBalances(ctx context.Context, id uuid.UUID, basic, pro, ultra int64, resetAt time.Time) error {
	builder := r.db.Wallet.UpdateOneID(id).
		SetDailyBasicTokenBalance(basic).
		SetDailyProTokenBalance(pro).
		SetDailyUltraTokenBalance(ultra).
		SetDailyResetAt(resetAt)

	_, err := builder.Save(ctx)
	if err != nil {
		return fmt.Errorf("failed to update token balances: %w", err)
	}
	return nil
}

// SetTokenQuotas sets day/week/month token balances with their reset timestamps.
func (r *walletRepo) SetTokenQuotas(ctx context.Context, id uuid.UUID, daily, weekly, monthly int64, dailyResetAt, weeklyResetAt, monthlyResetAt time.Time) error {
	_, err := r.db.Wallet.UpdateOneID(id).
		SetDailyTokenBalance(daily).
		SetWeeklyTokenBalance(weekly).
		SetMonthlyTokenBalance(monthly).
		SetDailyResetAt(dailyResetAt).
		SetWeeklyResetAt(weeklyResetAt).
		SetMonthlyResetAt(monthlyResetAt).
		Save(ctx)
	if err != nil {
		return fmt.Errorf("failed to set token quotas: %w", err)
	}
	return nil
}

// AddTokenBalances atomically adds delta (negative to deduct) to day/week/month token balances.
func (r *walletRepo) AddTokenBalances(ctx context.Context, id uuid.UUID, dailyDelta, weeklyDelta, monthlyDelta int64) error {
	_, err := r.db.Wallet.UpdateOneID(id).
		AddDailyTokenBalance(dailyDelta).
		AddWeeklyTokenBalance(weeklyDelta).
		AddMonthlyTokenBalance(monthlyDelta).
		Save(ctx)
	if err != nil {
		return fmt.Errorf("failed to adjust token balances: %w", err)
	}
	return nil
}
