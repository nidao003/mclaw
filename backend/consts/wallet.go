package consts

// CreditsPerToken defines the token-to-credit conversion rate: 1 credit = 10000 tokens.
// 会员档位配额（日/周/月 token）与积分同构，均按此换算。
const CreditsPerToken int64 = 10000

// TransactionKind defines the type of wallet transaction.
type TransactionKind string

const (
	// Income types
	TransactionSignupBonus        TransactionKind = "signup_bonus"
	TransactionVoucherExchange    TransactionKind = "voucher_exchange"
	TransactionInvitationReward   TransactionKind = "invitation_reward"
	TransactionProUpgradeRefund   TransactionKind = "pro_upgrade_refund"
	TransactionDailyGrant         TransactionKind = "daily_grant"
	TransactionTopUp              TransactionKind = "top_up"
	TransactionCheckin            TransactionKind = "checkin"
	TransactionSubscriptionGrant  TransactionKind = "subscription_grant"
	TransactionDailyBalanceMigration TransactionKind = "daily_balance_migration"

	// Expenditure types
	TransactionVMConsumption     TransactionKind = "vm_consumption"
	TransactionModelConsumption  TransactionKind = "model_consumption"
	TransactionMCPToolConsumption TransactionKind = "mcp_tool_consumption"
	TransactionDataApiConsumption TransactionKind = "data_api_consumption" // 数据 API 按次调用扣费
	TransactionProSubscription   TransactionKind = "pro_subscription"
	TransactionProAutoRenew      TransactionKind = "pro_auto_renew"
	TransactionUltraSubscription TransactionKind = "ultra_subscription"
	TransactionUltraAutoRenew    TransactionKind = "ultra_auto_renew"
	TransactionViolationFine     TransactionKind = "violation_fine"
	TransactionSubscriptionPurchase TransactionKind = "subscription_purchase"
)

// TransactionInoutType defines whether a transaction is income or expenditure.
type TransactionInoutType string

const (
	TransactionIn  TransactionInoutType = "in"
	TransactionOut TransactionInoutType = "out"
)

// PaymentOrderStatus defines the status of a payment order.
type PaymentOrderStatus string

const (
	PaymentPending  PaymentOrderStatus = "pending"
	PaymentPaid     PaymentOrderStatus = "paid"
	PaymentFailed   PaymentOrderStatus = "failed"
	PaymentRefunded PaymentOrderStatus = "refunded"
)

// PaymentOrderType defines the type of payment.
type PaymentOrderType string

const (
	PaymentTypeSubscription PaymentOrderType = "subscription"
	PaymentTypeRecharge     PaymentOrderType = "recharge"
)
