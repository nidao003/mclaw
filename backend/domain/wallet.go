package domain

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/nidao003/mclaw/backend/consts"
	"github.com/nidao003/mclaw/backend/db"
)

// WalletUsecase defines the business logic for credit wallet management.
type WalletUsecase interface {
	// Get returns the wallet for a user (auto-creates if not exists).
	Get(ctx context.Context, userID uuid.UUID) (*Wallet, error)
	// CheckIn performs daily check-in and grants credits.
	CheckIn(ctx context.Context, userID uuid.UUID) (*CheckInResp, error)
	// GetCheckInStatus returns whether the user has checked in today.
	GetCheckInStatus(ctx context.Context, userID uuid.UUID) (*CheckInResp, error)
	// Exchange redeems an exchange code for credits.
	Exchange(ctx context.Context, userID uuid.UUID, req *ExchangeReq) error
	// Recharge creates a recharge order and returns a payment URL.
	Recharge(ctx context.Context, userID uuid.UUID, req *RechargeReq) (*RechargeResp, error)
	// ListTransactions returns paginated transaction history.
	ListTransactions(ctx context.Context, userID uuid.UUID, req *ListTransactionReq) (*ListTransactionResp, error)
	// Deduct deducts credits from a user's wallet.
	Deduct(ctx context.Context, userID uuid.UUID, kind consts.TransactionKind, amount int64, remark string, sourceID string) error
	// Grant adds credits to a user's wallet.
	Grant(ctx context.Context, userID uuid.UUID, kind consts.TransactionKind, amount int64, remark string, sourceID string) error
	// DailyTokenReset resets daily token quotas based on subscription plan (legacy, kept for compat).
	DailyTokenReset(ctx context.Context, userID uuid.UUID) error
	// ResetTokenQuotas lazily resets day/week/month token quotas based on subscription plan.
	ResetTokenQuotas(ctx context.Context, userID uuid.UUID) error
	// DeductTokensFromQuota deducts amount from the free token quota (day/week/month cycles).
	// Returns: deductedFromQuota = actual tokens deducted from free quota;
	// remaining = tokens that could not be covered by free quota (caller should deduct credits).
	DeductTokensFromQuota(ctx context.Context, userID uuid.UUID, amount int64) (deductedFromQuota, remaining int64, err error)
}

// WalletRepo defines the data access for wallets.
type WalletRepo interface {
	GetByUserID(ctx context.Context, userID uuid.UUID) (*db.Wallet, error)
	Create(ctx context.Context, wallet *db.Wallet) (*db.Wallet, error)
	UpdateBalance(ctx context.Context, id uuid.UUID, balanceDelta, consumedDelta, grantedDelta int64) error
	UpdateTokenBalances(ctx context.Context, id uuid.UUID, basic, pro, ultra int64, resetAt time.Time) error
	// SetTokenQuotas sets day/week/month token balances with their reset timestamps.
	SetTokenQuotas(ctx context.Context, id uuid.UUID, daily, weekly, monthly int64, dailyResetAt, weeklyResetAt, monthlyResetAt time.Time) error
	// AddTokenBalances atomically adds delta (negative to deduct) to day/week/month token balances.
	AddTokenBalances(ctx context.Context, id uuid.UUID, dailyDelta, weeklyDelta, monthlyDelta int64) error
}

// TransactionRepo defines the data access for transaction logs.
type TransactionRepo interface {
	Create(ctx context.Context, log *db.TransactionLog) (*db.TransactionLog, error)
	ListByUserID(ctx context.Context, userID uuid.UUID, req *ListTransactionReq) ([]*db.TransactionLog, int, error)
}

// CheckInRepo defines the data access for check-ins.
type CheckInRepo interface {
	GetByUserAndDate(ctx context.Context, userID uuid.UUID, date time.Time) (*db.CheckIn, error)
	Create(ctx context.Context, checkIn *db.CheckIn) (*db.CheckIn, error)
}

// InvitationRepo defines the data access for invitations.
type InvitationRepo interface {
	ListByInviter(ctx context.Context, inviterID uuid.UUID) ([]*db.Invitation, error)
	Create(ctx context.Context, inv *db.Invitation) (*db.Invitation, error)
}

// ExchangeCodeRepo defines the data access for exchange codes.
type ExchangeCodeRepo interface {
	GetByCode(ctx context.Context, code string) (*db.ExchangeCode, error)
	IncrementUsedCount(ctx context.Context, id uuid.UUID) error
}

// --- Domain Models ---

// Wallet represents a user's credit wallet.
type Wallet struct {
	ID                      uuid.UUID  `json:"id"`
	UserID                  uuid.UUID  `json:"user_id"`
	Balance                 int64      `json:"balance"`
	TotalRecharged          int64      `json:"total_recharged"`
	TotalConsumed           int64      `json:"total_consumed"`
	TotalGranted            int64      `json:"total_granted"`
	// 统一 token 池（日/周/月三周期）
	DailyTokenBalance       int64      `json:"daily_token_balance"`
	WeeklyTokenBalance      int64      `json:"weekly_token_balance"`
	MonthlyTokenBalance     int64      `json:"monthly_token_balance"`
	DailyResetAt            *time.Time `json:"daily_reset_at"`
	WeeklyResetAt           *time.Time `json:"weekly_reset_at"`
	MonthlyResetAt          *time.Time `json:"monthly_reset_at"`
	EnableCreditConsumption bool       `json:"enable_credit_consumption"`
}

func (w *Wallet) From(src *db.Wallet) *Wallet {
	if src == nil {
		return w
	}
	w.ID = src.ID
	w.UserID = src.UserID
	w.Balance = src.Balance
	w.TotalRecharged = src.TotalRecharged
	w.TotalConsumed = src.TotalConsumed
	w.TotalGranted = src.TotalGranted
	w.DailyTokenBalance = src.DailyTokenBalance
	w.WeeklyTokenBalance = src.WeeklyTokenBalance
	w.MonthlyTokenBalance = src.MonthlyTokenBalance
	w.DailyResetAt = &src.DailyResetAt
	w.WeeklyResetAt = &src.WeeklyResetAt
	w.MonthlyResetAt = &src.MonthlyResetAt
	w.EnableCreditConsumption = src.EnableCreditConsumption
	return w
}

// TransactionLog represents a wallet transaction record.
// Fields match MonkeyCode frontend DomainTransactionLog.
type TransactionLog struct {
	ID            uuid.UUID                   `json:"id"`
	UserID        uuid.UUID                   `json:"user_id"`
	Kind          consts.TransactionKind      `json:"kind"`
	InoutType     consts.TransactionInoutType `json:"inout_type"`
	Amount        int64                       `json:"amount"`
	AmountBalance int64                       `json:"amount_balance"` // balance change
	AmountDaily   int64                       `json:"amount_daily"`   // daily wallet change
	Balance       int64                       `json:"balance"`
	Remark        string                      `json:"remark"`
	SourceID      string                      `json:"source_id,omitempty"`
	CreatedAt     int64                       `json:"created_at"` // Unix timestamp in seconds (frontend expects this)
}

func (t *TransactionLog) From(src *db.TransactionLog) *TransactionLog {
	if src == nil {
		return t
	}
	t.ID = src.ID
	t.UserID = src.UserID
	t.Kind = src.Kind
	t.InoutType = src.InoutType
	t.Amount = src.Amount
	t.Balance = src.Balance
	t.Remark = src.Remark
	t.SourceID = src.SourceID
	t.CreatedAt = src.CreatedAt.Unix() // convert to Unix seconds for frontend
	return t
}

// InvitationItem represents a single invitation record.
// Fields match MonkeyCode frontend DomainInvitationItem.
type InvitationItem struct {
	ID        uuid.UUID `json:"id"`
	InviteeID uuid.UUID `json:"invitee_id"`
	Name      string    `json:"name"`
	AvatarURL string    `json:"avatar_url"`
	Credits   int64     `json:"credits"`
	InvitedAt int64     `json:"invited_at"` // Unix timestamp in seconds (frontend uses dayjs.unix)
}

// InvitationListResp is the response for listing invitations.
type InvitationListResp struct {
	Count int               `json:"count"`
	Items []*InvitationItem `json:"items"`
}

// --- Request/Response Types ---

// CheckInResp is the response for check-in status.
type CheckInResp struct {
	CheckedIn bool `json:"checked_in"`
}

// CheckInReq is the request for daily check-in (matches frontend DomainCheckInReq).
type CheckInReq struct {
	CaptchaToken string `json:"captcha_token"` // captcha validation token
}

// ExchangeReq is the request to redeem an exchange code.
type ExchangeReq struct {
	Code string `json:"code" validate:"required"`
}

// RechargeReq is the request to recharge credits.
type RechargeReq struct {
	Credits     int64  `json:"credits" validate:"required"`
	Plan        string `json:"plan,omitempty"`
	PeriodCount int    `json:"period_count,omitempty"`
	PeriodUnit  string `json:"period_unit,omitempty"`
}

// RechargeResp is the response containing the payment URL.
type RechargeResp struct {
	URL string `json:"url"`
}

// ListTransactionReq is the request for paginated transaction history.
type ListTransactionReq struct {
	Cursor string `query:"cursor"`
	Limit  int    `query:"limit"`
	Kind   string `query:"kind,omitempty"`
}

// ListTransactionResp is the paginated transaction response.
type ListTransactionResp struct {
	Transactions []*TransactionLog `json:"transactions"`
	Page         *CursorPage       `json:"page,omitempty"`
}

// CursorPage represents cursor-based pagination info.
type CursorPage struct {
	NextCursor string `json:"next_cursor,omitempty"`
	HasMore    bool   `json:"has_more"`
}

// --- Admin Request Types ---

// AdminAdjustBalanceReq is the request for admins to adjust a user's balance.
type AdminAdjustBalanceReq struct {
	UserID  uuid.UUID `json:"user_id" validate:"required"`
	Amount  int64     `json:"amount" validate:"required"` // positive to grant, negative to deduct
	Remark  string    `json:"remark"`
}

// AdminFreezeWalletReq is the request for admins to freeze/unfreeze a wallet.
type AdminFreezeWalletReq struct {
	UserID  uuid.UUID `json:"user_id" validate:"required"`
	Freeze  bool      `json:"freeze"`
}

// AdminGenerateExchangeCodesReq is the request for admins to batch-generate exchange codes.
type AdminGenerateExchangeCodesReq struct {
	Credits   int64      `json:"credits" validate:"required"`
	Count     int        `json:"count" validate:"required"`
	MaxUses   int        `json:"max_uses"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}
