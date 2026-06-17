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
		field.Int64("daily_basic_token_balance").Default(0),              // remaining basic model daily token quota
		field.Int64("daily_pro_token_balance").Default(0),                // remaining pro model daily token quota
		field.Int64("daily_ultra_token_balance").Default(0),              // remaining ultra model daily token quota
		field.Time("daily_reset_at").Optional(),                          // last daily quota reset time
		field.Bool("enable_credit_consumption").Default(true),            // allow credit deduction after quota exhausted
		field.Time("created_at").Default(time.Now),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}
