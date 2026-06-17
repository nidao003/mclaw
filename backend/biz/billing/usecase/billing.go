package usecase

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/samber/do"
	"go.uber.org/zap"

	"github.com/nidao003/mclaw/backend/consts"
	"github.com/nidao003/mclaw/backend/domain"
	"github.com/nidao003/mclaw/backend/errcode"
)

type billingUsecase struct {
	subUsecase   domain.SubscriptionUsecase
	walletUsecase domain.WalletUsecase
	log          *zap.Logger
}

// NewBillingUsecase creates a new BillingUsecase instance.
func NewBillingUsecase(i *do.Injector) (domain.BillingUsecase, error) {
	subUC := do.MustInvoke[domain.SubscriptionUsecase](i)
	walletUC := do.MustInvoke[domain.WalletUsecase](i)
	logger := do.MustInvoke[*zap.Logger](i)
	return &billingUsecase{
		subUsecase:   subUC,
		walletUsecase: walletUC,
		log:          logger,
	}, nil
}

// CheckModelAccess verifies if a user can access a model.
func (uc *billingUsecase) CheckModelAccess(ctx context.Context, userID uuid.UUID, accessLevel consts.ModelAccessLevel, isFree bool) bool {
	return uc.subUsecase.CheckModelAccess(ctx, userID, accessLevel, isFree)
}

// RecordUsageAndDeduct records token usage and deducts from the user's quota/wallet.
// Deduction priority: daily token quota → credit balance → insufficient error.
func (uc *billingUsecase) RecordUsageAndDeduct(ctx context.Context, userID uuid.UUID, modelName string, inputTokens, outputTokens uint64) error {
	totalTokens := int64(inputTokens + outputTokens)
	if totalTokens <= 0 {
		return nil
	}

	// Ensure daily token quota is reset
	if err := uc.walletUsecase.DailyTokenReset(ctx, userID); err != nil {
		uc.log.Warn("failed to reset daily token quota", zap.Error(err), zap.String("user_id", userID.String()))
	}

	// Get current wallet state
	wallet, err := uc.walletUsecase.Get(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get wallet: %w", err)
	}

	// Try to deduct from daily token quotas first
	// Determine which tier this model belongs to and deduct accordingly
	// For simplicity: deduct from the highest available quota first
	remaining := totalTokens

	// Deduct from ultra token quota
	if remaining > 0 && wallet.DailyUltraTokenBalance > 0 {
		deduct := min(remaining, wallet.DailyUltraTokenBalance)
		remaining -= deduct
	}

	// Deduct from pro token quota
	if remaining > 0 && wallet.DailyProTokenBalance > 0 {
		deduct := min(remaining, wallet.DailyProTokenBalance)
		remaining -= deduct
	}

	// Deduct from basic token quota
	if remaining > 0 && wallet.DailyBasicTokenBalance > 0 {
		deduct := min(remaining, wallet.DailyBasicTokenBalance)
		remaining -= deduct
	}

	// If still remaining, deduct from credit balance
	// Conversion: 1 credit = 1000 tokens (adjustable via config)
	if remaining > 0 {
		creditsNeeded := (remaining + 999) / 1000 // ceiling division
		if wallet.Balance < creditsNeeded {
			return errcode.ErrInsufficientTokenQuota
		}
		if err := uc.walletUsecase.Deduct(ctx, userID, consts.TransactionModelConsumption, creditsNeeded, fmt.Sprintf("模型调用: %s", modelName), ""); err != nil {
			return fmt.Errorf("failed to deduct credits: %w", err)
		}
	}

	return nil
}

func min(a, b int64) int64 {
	if a < b {
		return a
	}
	return b
}
