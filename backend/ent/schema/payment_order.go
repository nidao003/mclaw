package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"

	"github.com/nidao003/mclaw/backend/consts"
)

// PaymentOrder holds the schema definition for the PaymentOrder entity.
// Records payment orders for subscriptions and credit recharges.
type PaymentOrder struct {
	ent.Schema
}

func (PaymentOrder) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Table("payment_orders"),
	}
}

// Fields of the PaymentOrder.
func (PaymentOrder) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Unique(),
		field.UUID("user_id", uuid.UUID{}),
		field.String("order_no").Unique().NotEmpty(),                     // merchant order number
		field.String("trade_no").Optional(),                               // payment provider transaction number
		field.String("type").GoType(consts.PaymentOrderType("")),          // subscription or recharge
		field.Int64("amount"),                                              // amount in cents (分)
		field.String("status").GoType(consts.PaymentOrderStatus("")),      // payment status
		field.String("description").Optional(),                             // order description
		field.String("payment_url").Optional(),                             // payment URL (for redirect)
		field.JSON("metadata", map[string]string{}).Optional(),             // additional order metadata
		field.Time("paid_at").Optional(),                                   // payment success time
		field.Time("expired_at").Optional(),                                // order expiration time
		field.Time("created_at").Default(time.Now),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

// Indexes of the PaymentOrder.
func (PaymentOrder) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id"),
		index.Fields("order_no"),
		index.Fields("status"),
		index.Fields("user_id", "created_at"),
	}
}
