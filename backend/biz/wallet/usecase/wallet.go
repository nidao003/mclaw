package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/samber/do"
	"go.uber.org/zap"

	"github.com/nidao003/mclaw/backend/consts"
	"github.com/nidao003/mclaw/backend/db"
	"github.com/nidao003/mclaw/backend/domain"
	"github.com/nidao003/mclaw/backend/errcode"
	"github.com/nidao003/mclaw/backend/pkg/cvt"
)

type walletUsecase struct {
	walletRepo     domain.WalletRepo
	transactionRepo domain.TransactionRepo
	checkInRepo    domain.CheckInRepo
	invitationRepo domain.InvitationRepo
	exchangeRepo   domain.ExchangeCodeRepo
	subUsecase     domain.SubscriptionUsecase
	paymentUC      domain.PaymentUsecase
	log            *zap.Logger
}

// NewWalletUsecase creates a new WalletUsecase instance.
func NewWalletUsecase(i *do.Injector) (domain.WalletUsecase, error) {
	walletRepo := do.MustInvoke[domain.WalletRepo](i)
	transactionRepo := do.MustInvoke[domain.TransactionRepo](i)
	checkInRepo := do.MustInvoke[domain.CheckInRepo](i)
	invitationRepo := do.MustInvoke[domain.InvitationRepo](i)
	exchangeRepo := do.MustInvoke[domain.ExchangeCodeRepo](i)
	subUC := do.MustInvoke[domain.SubscriptionUsecase](i)
	logger := do.MustInvoke[*zap.Logger](i)

	// PaymentUsecase 由 payment.InvokePayment 在 wallet 构造完成后注入，
	// 不在构造函数中获取，避免与 NewPaymentUsecase 的循环依赖死锁
	var paymentUC domain.PaymentUsecase // nil until set via SetPaymentUsecase

	return &walletUsecase{
		walletRepo:     walletRepo,
		transactionRepo: transactionRepo,
		checkInRepo:    checkInRepo,
		invitationRepo: invitationRepo,
		exchangeRepo:   exchangeRepo,
		subUsecase:     subUC,
		paymentUC:      paymentUC,
		log:            logger,
	}, nil
}

// Get returns the wallet for a user (auto-creates if not exists).
func (uc *walletUsecase) Get(ctx context.Context, userID uuid.UUID) (*domain.Wallet, error) {
	w, err := uc.walletRepo.GetByUserID(ctx, userID)
	if err != nil {
		// auto-create wallet for new users
		newWallet := &db.Wallet{
			UserID:                  userID,
			Balance:                 0,
			DailyBasicTokenBalance:  0,
			DailyProTokenBalance:    0,
			DailyUltraTokenBalance:  0,
			EnableCreditConsumption: true,
		}
		created, createErr := uc.walletRepo.Create(ctx, newWallet)
		if createErr != nil {
			return nil, fmt.Errorf("failed to auto-create wallet: %w", createErr)
		}
		// Grant signup bonus
		_ = uc.Grant(ctx, userID, consts.TransactionSignupBonus, 5000, "注册赠送", "")
		// Refresh after grant
		w, _ = uc.walletRepo.GetByUserID(ctx, userID)
		if w == nil {
			w = created
		}
	}
	return cvt.From(w, &domain.Wallet{}), nil
}

// CheckIn performs daily check-in and grants credits.
func (uc *walletUsecase) CheckIn(ctx context.Context, userID uuid.UUID) (*domain.CheckInResp, error) {
	now := time.Now()

	// Check if already checked in today
	_, err := uc.checkInRepo.GetByUserAndDate(ctx, userID, now)
	if err == nil {
		return &domain.CheckInResp{CheckedIn: true}, errcode.ErrAlreadyCheckedIn
	}

	// Create check-in record
	reward := int64(100) // 100 credits per check-in
	_, err = uc.checkInRepo.Create(ctx, &db.CheckIn{
		UserID:    userID,
		CheckedAt: now,
		Reward:    reward,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create check-in: %w", err)
	}

	// Grant reward credits
	if grantErr := uc.Grant(ctx, userID, consts.TransactionCheckin, reward, "每日签到奖励", ""); grantErr != nil {
		uc.log.Error("failed to grant check-in reward", zap.Error(grantErr), zap.String("user_id", userID.String()))
	}

	return &domain.CheckInResp{CheckedIn: true}, nil
}

// GetCheckInStatus returns whether the user has checked in today.
func (uc *walletUsecase) GetCheckInStatus(ctx context.Context, userID uuid.UUID) (*domain.CheckInResp, error) {
	now := time.Now()
	_, err := uc.checkInRepo.GetByUserAndDate(ctx, userID, now)
	if err != nil {
		return &domain.CheckInResp{CheckedIn: false}, nil
	}
	return &domain.CheckInResp{CheckedIn: true}, nil
}

// Exchange redeems an exchange code for credits.
func (uc *walletUsecase) Exchange(ctx context.Context, userID uuid.UUID, req *domain.ExchangeReq) error {
	ec, err := uc.exchangeRepo.GetByCode(ctx, req.Code)
	if err != nil {
		return errcode.ErrInvalidExchangeCode
	}

	// Validate code
	if !ec.IsActive {
		return errcode.ErrInvalidExchangeCode
	}
	if ec.UsedCount >= ec.MaxUses {
		return errcode.ErrExchangeCodeUsed
	}
	if !ec.ExpiresAt.IsZero() && time.Now().After(ec.ExpiresAt) {
		return errcode.ErrExchangeCodeExpired
	}

	// Increment usage
	if err := uc.exchangeRepo.IncrementUsedCount(ctx, ec.ID); err != nil {
		return fmt.Errorf("failed to update exchange code usage: %w", err)
	}

	// Grant credits
	return uc.Grant(ctx, userID, consts.TransactionVoucherExchange, ec.Credits, "兑换码充值", ec.ID.String())
}

// Recharge creates a recharge order via the payment module.
// Credits are granted after payment is confirmed (see payment callback handler).
func (uc *walletUsecase) Recharge(ctx context.Context, userID uuid.UUID, req *domain.RechargeReq) (*domain.RechargeResp, error) {
	// Delegate to payment module for real payment flow
	if uc.paymentUC != nil {
		amountCents := uc.creditsToAmount(req.Credits)
		desc := fmt.Sprintf("充值 %d 积分", req.Credits)
		resp, err := uc.paymentUC.CreateOrder(ctx, userID, &domain.CreateOrderReq{
			Type:        consts.PaymentTypeRecharge,
			Amount:      amountCents,
			Description: desc,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create recharge order: %w", err)
		}
		return &domain.RechargeResp{URL: resp.PaymentURL}, nil
	}

	// Fallback: direct grant when payment module is not available
	if req.Credits > 0 {
		if err := uc.Grant(ctx, userID, consts.TransactionTopUp, req.Credits, "积分充值", ""); err != nil {
			return nil, fmt.Errorf("failed to grant recharge credits: %w", err)
		}
	}

	return &domain.RechargeResp{
		URL: "", // empty URL means no redirect needed (direct grant fallback)
	}, nil
}

// ListTransactions returns paginated transaction history.
func (uc *walletUsecase) ListTransactions(ctx context.Context, userID uuid.UUID, req *domain.ListTransactionReq) (*domain.ListTransactionResp, error) {
	logs, count, err := uc.transactionRepo.ListByUserID(ctx, userID, req)
	if err != nil {
		return nil, err
	}

	transactions := make([]*domain.TransactionLog, 0, len(logs))
	for _, l := range logs {
		transactions = append(transactions, cvt.From(l, &domain.TransactionLog{}))
	}

	resp := &domain.ListTransactionResp{
		Transactions: transactions,
	}

	if len(transactions) > 0 && count >= req.Limit {
		resp.Page = &domain.CursorPage{
			NextCursor: transactions[len(transactions)-1].ID.String(),
			HasMore:    true,
		}
	}

	return resp, nil
}

// Deduct deducts credits from a user's wallet.
func (uc *walletUsecase) Deduct(ctx context.Context, userID uuid.UUID, kind consts.TransactionKind, amount int64, remark string, sourceID string) error {
	if amount <= 0 {
		return fmt.Errorf("deduct amount must be positive")
	}

	w, err := uc.walletRepo.GetByUserID(ctx, userID)
	if err != nil {
		return errcode.ErrWalletNotFound
	}

	if w.Balance < amount {
		return errcode.ErrInsufficientBalance
	}

	if err := uc.walletRepo.UpdateBalance(ctx, w.ID, -amount, amount, 0); err != nil {
		return fmt.Errorf("failed to deduct wallet balance: %w", err)
	}

	// Read back the balance after atomic update for accurate transaction log
	updated, readErr := uc.walletRepo.GetByUserID(ctx, userID)
	newBalance := w.Balance - amount // fallback estimate
	if readErr == nil && updated != nil {
		newBalance = updated.Balance
	}

	_, txErr := uc.transactionRepo.Create(ctx, &db.TransactionLog{
		UserID:    userID,
		Kind:      kind,
		InoutType: consts.TransactionOut,
		Amount:    amount,
		Balance:   newBalance,
		Remark:    remark,
		SourceID:  sourceID,
	})
	if txErr != nil {
		uc.log.Error("failed to create deduction transaction log", zap.Error(txErr), zap.String("user_id", userID.String()))
	}

	return nil
}

// Grant adds credits to a user's wallet.
func (uc *walletUsecase) Grant(ctx context.Context, userID uuid.UUID, kind consts.TransactionKind, amount int64, remark string, sourceID string) error {
	if amount <= 0 {
		return nil
	}

	w, err := uc.walletRepo.GetByUserID(ctx, userID)
	if err != nil {
		return errcode.ErrWalletNotFound
	}

	if err := uc.walletRepo.UpdateBalance(ctx, w.ID, amount, 0, amount); err != nil {
		return fmt.Errorf("failed to grant wallet balance: %w", err)
	}

	// Read back the balance after atomic update for accurate transaction log
	updated, readErr := uc.walletRepo.GetByUserID(ctx, userID)
	newBalance := w.Balance + amount // fallback estimate
	if readErr == nil && updated != nil {
		newBalance = updated.Balance
	}

	_, txErr := uc.transactionRepo.Create(ctx, &db.TransactionLog{
		UserID:    userID,
		Kind:      kind,
		InoutType: consts.TransactionIn,
		Amount:    amount,
		Balance:   newBalance,
		Remark:    remark,
		SourceID:  sourceID,
	})
	if txErr != nil {
		uc.log.Error("failed to create grant transaction log", zap.Error(txErr), zap.String("user_id", userID.String()))
	}

	return nil
}

// DailyTokenReset resets daily token quotas based on subscription plan.
func (uc *walletUsecase) DailyTokenReset(ctx context.Context, userID uuid.UUID) error {
	w, err := uc.walletRepo.GetByUserID(ctx, userID)
	if err != nil {
		return errcode.ErrWalletNotFound
	}

	now := time.Now()
	if !w.DailyResetAt.IsZero() && isSameDay(w.DailyResetAt, now) {
		return nil // already reset today
	}

	quota, err := uc.subUsecase.GetTokenQuota(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get token quota: %w", err)
	}

	return uc.walletRepo.UpdateTokenBalances(ctx, w.ID,
		quota.BasicTokenQuota,
		quota.ProTokenQuota,
		quota.UltraTokenQuota,
		now,
	)
}

// isSameDay checks if two timestamps are on the same calendar day.
func isSameDay(a, b time.Time) bool {
	return a.Year() == b.Year() && a.Month() == b.Month() && a.Day() == b.Day()
}

// creditsToAmount converts credit amount to payment amount in cents.
// Pricing tiers (matching payment usecase amountToCredits):
//
//	2,000 credits → ¥10 (1000 cents)
//	15,000 credits → ¥50 (5000 cents)
//	100,000 credits → ¥250 (25000 cents)
//	500,000 credits → ¥1000 (100000 cents)
func (uc *walletUsecase) creditsToAmount(credits int64) int64 {
	switch credits {
	case 2000:
		return 1000
	case 15000:
		return 5000
	case 100000:
		return 25000
	case 500000:
		return 100000
	default:
		// Linear: 2 credits per cent
		return credits / 2
	}
}
