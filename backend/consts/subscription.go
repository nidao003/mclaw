package consts

// SubscriptionPlan defines the plan tier name.
type SubscriptionPlan string

const (
	PlanBasic SubscriptionPlan = "basic"
	PlanPro   SubscriptionPlan = "pro"
	PlanUltra SubscriptionPlan = "ultra"
)

// SubscriptionStatus defines the status of a user subscription.
type SubscriptionStatus string

const (
	SubscriptionActive    SubscriptionStatus = "active"
	SubscriptionExpired   SubscriptionStatus = "expired"
	SubscriptionCancelled SubscriptionStatus = "cancelled"
)

// SubscriptionPeriodUnit defines the billing period unit.
type SubscriptionPeriodUnit string

const (
	PeriodMonth SubscriptionPeriodUnit = "month"
	PeriodYear  SubscriptionPeriodUnit = "year"
)

// ModelAccessLevel defines the model access tier required.
type ModelAccessLevel string

const (
	AccessBasic ModelAccessLevel = "basic" // available to all users
	AccessPro   ModelAccessLevel = "pro"   // requires pro subscription
	AccessUltra ModelAccessLevel = "ultra" // requires ultra subscription
)
