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
// Deduction priority: free token quota (day/week/month,取三者最小) → credit balance → insufficient error.
// 修复点：旧版只算局部变量不写回 DB 导致日额度形同虚设；本版通过 DeductTokensFromQuota 原子写回。
func (uc *billingUsecase) RecordUsageAndDeduct(ctx context.Context, userID uuid.UUID, modelName string, inputTokens, outputTokens uint64) error {
	totalTokens := int64(inputTokens + outputTokens)
	if totalTokens <= 0 {
		return nil
	}

	// 懒触发日/周/月额度重置
	if err := uc.walletUsecase.ResetTokenQuotas(ctx, userID); err != nil {
		uc.log.Warn("failed to reset token quotas", zap.Error(err), zap.String("user_id", userID.String()))
	}

	// 从免费额度扣（日/周/月三周期取最小值作为可用免费额度）
	_, remaining, err := uc.walletUsecase.DeductTokensFromQuota(ctx, userID, totalTokens)
	if err != nil {
		return fmt.Errorf("failed to deduct token quota: %w", err)
	}
	if remaining <= 0 {
		return nil
	}

	// 免费额度不足，读钱包判断是否允许扣积分
	wallet, err := uc.walletUsecase.Get(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get wallet: %w", err)
	}
	if !wallet.EnableCreditConsumption {
		return errcode.ErrInsufficientTokenQuota
	}

	// 超额部分按 1 积分 = CreditsPerToken token 扣积分
	creditsNeeded := (remaining + consts.CreditsPerToken - 1) / consts.CreditsPerToken // 向上取整
	if wallet.Balance < creditsNeeded {
		return errcode.ErrInsufficientTokenQuota
	}
	if err := uc.walletUsecase.Deduct(ctx, userID, consts.TransactionModelConsumption, creditsNeeded, fmt.Sprintf("模型调用: %s", modelName), ""); err != nil {
		return fmt.Errorf("failed to deduct credits: %w", err)
	}

	return nil
}
