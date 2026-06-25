package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

// Plan holds the schema definition for the Plan entity.
// mclaw subscription plan definition (basic/pro/ultra).
type Plan struct {
	ent.Schema
}

func (Plan) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Table("plans"),
	}
}

// Fields of the Plan.
func (Plan) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Unique(),
		field.String("name").Unique().NotEmpty(),              // basic, pro, ultra
		field.String("display_name").Optional(),                // display name for UI
		field.Int64("price_month").Default(0),                  // monthly price in cents (分)
		field.Int64("price_year").Default(0),                   // yearly price in cents (分)
		// 统一 token 池配额（日/周/月三周期，按会员档位）
		field.Int64("daily_token_quota").Default(0),            // 每日 token 额度
		field.Int64("weekly_token_quota").Default(0),           // 每周 token 额度
		field.Int64("monthly_token_quota").Default(0),          // 每月 token 额度
		field.Int64("monthly_credits").Default(0),              // monthly granted credits
		// 旧版按模型级别配额字段（已废弃，保留兼容）
		field.Int64("basic_token_quota").Default(0),            // deprecated
		field.Int64("pro_token_quota").Default(0),              // deprecated
		field.Int64("ultra_token_quota").Default(0),            // deprecated
		field.Int("max_concurrency").Default(1),                // max concurrent tasks
		field.JSON("features", []string{}).Optional(),          // feature list
		field.Bool("is_default").Default(false),                // default plan for new users
		field.Bool("is_active").Default(true),                  // plan is available for purchase
		field.Int("sort_order").Default(0),                     // display order
		field.Time("created_at").Default(time.Now),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

// Edges of the Plan.
func (Plan) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("subscriptions", UserSubscription.Type),
	}
}
