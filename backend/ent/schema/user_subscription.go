package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"

	"github.com/nidao003/mclaw/backend/consts"
	"github.com/nidao003/mclaw/backend/pkg/entx"
)

// UserSubscription holds the schema definition for the UserSubscription entity.
// Links a user to their active subscription plan.
type UserSubscription struct {
	ent.Schema
}

func (UserSubscription) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Table("user_subscriptions"),
	}
}

func (UserSubscription) Mixin() []ent.Mixin {
	return []ent.Mixin{
		entx.SoftDeleteMixin2{},
	}
}

// Fields of the UserSubscription.
func (UserSubscription) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Unique(),
		field.UUID("user_id", uuid.UUID{}),
		field.UUID("plan_id", uuid.UUID{}),
		field.String("status").GoType(consts.SubscriptionStatus("")),    // active, expired, cancelled
		field.String("period_unit").GoType(consts.SubscriptionPeriodUnit("")), // month, year
		field.Int("period_count").Default(1),                             // number of periods purchased
		field.Bool("auto_renew").Default(false),                          // auto renew on expiry
		field.Bool("enable_credit_consumption").Default(true),            // allow credit deduction after quota exhausted
		field.Time("started_at").Default(time.Now),                       // subscription start time
		field.Time("expires_at").Optional(),                              // subscription expiry time
		field.Time("created_at").Default(time.Now),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

// Edges of the UserSubscription.
func (UserSubscription) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("plan", Plan.Type).Ref("subscriptions").Field("plan_id").Unique().Required(),
	}
}
