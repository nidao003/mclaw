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
		field.Int64("basic_token_quota").Default(0),            // daily basic model token quota
		field.Int64("pro_token_quota").Default(0),              // daily pro model token quota
		field.Int64("ultra_token_quota").Default(0),            // daily ultra model token quota
		field.Int64("monthly_credits").Default(0),              // monthly granted credits
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
