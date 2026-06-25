package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

// Wallet holds the schema definition for the Wallet entity.
// Per-user credit/point wallet with daily token quotas.
type Wallet struct {
	ent.Schema
}

func (Wallet) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Table("wallets"),
	}
}

// Fields of the Wallet.
func (Wallet) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Unique(),
		field.UUID("user_id", uuid.UUID{}).Unique(),                    // one wallet per user
		field.Int64("balance").Default(0),                                // current credit balance
		field.Int64("total_recharged").Default(0),                        // cumulative recharged credits
		field.Int64("total_consumed").Default(0),                         // cumulative consumed credits
		field.Int64("total_granted").Default(0),                          // cumulative granted credits
		// 统一 token 池（按会员档位配额，不再按模型级别分池）—— 日/周/月三周期
		field.Int64("daily_token_balance").Default(0),                    // 剩余日 token 额度
		field.Int64("weekly_token_balance").Default(0),                   // 剩余周 token 额度
		field.Int64("monthly_token_balance").Default(0),                  // 剩余月 token 额度
		field.Time("daily_reset_at").Optional(),                          // 上次日额度重置时间
		field.Time("weekly_reset_at").Optional(),                         // 上周周额度重置时间
		field.Time("monthly_reset_at").Optional(),                        // 上月月额度重置时间
		// 旧版按模型级别分池字段（已废弃，保留兼容，不再读写）
		field.Int64("daily_basic_token_balance").Default(0),              // deprecated
		field.Int64("daily_pro_token_balance").Default(0),                // deprecated
		field.Int64("daily_ultra_token_balance").Default(0),              // deprecated
		field.Bool("enable_credit_consumption").Default(true),            // allow credit deduction after quota exhausted
		field.Time("created_at").Default(time.Now),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}
