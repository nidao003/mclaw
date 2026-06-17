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

// TransactionLog holds the schema definition for the TransactionLog entity.
// Records all wallet credit movements (income and expenditure).
type TransactionLog struct {
	ent.Schema
}

func (TransactionLog) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Table("transaction_logs"),
	}
}

// Fields of the TransactionLog.
func (TransactionLog) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Unique(),
		field.UUID("user_id", uuid.UUID{}),
		field.String("kind").GoType(consts.TransactionKind("")),     // transaction type
		field.String("inout_type").GoType(consts.TransactionInoutType("")), // in or out
		field.Int64("amount"),                                         // amount (always positive)
		field.Int64("balance"),                                        // balance after transaction
		field.String("remark").Optional(),                             // transaction remark
		field.String("source_id").Optional(),                          // related entity ID (order ID, skill ID, etc.)
		field.Time("created_at").Default(time.Now),
	}
}

// Indexes of the TransactionLog.
func (TransactionLog) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id"),
		index.Fields("user_id", "kind"),
		index.Fields("user_id", "created_at"),
	}
}
