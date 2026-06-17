package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// ExchangeCode holds the schema definition for the ExchangeCode entity.
// Redemption codes that grant credits when exchanged.
type ExchangeCode struct {
	ent.Schema
}

func (ExchangeCode) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Table("exchange_codes"),
	}
}

// Fields of the ExchangeCode.
func (ExchangeCode) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Unique(),
		field.String("code").Unique().NotEmpty(),    // the redemption code
		field.Int64("credits"),                       // credits granted on exchange
		field.Int("max_uses").Default(1),             // max number of times this code can be used
		field.Int("used_count").Default(0),           // how many times it has been used
		field.Time("expires_at").Optional(),          // expiration time
		field.UUID("created_by", uuid.UUID{}),        // admin who created the code
		field.Bool("is_active").Default(true),        // code is still valid
		field.Time("created_at").Default(time.Now),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

// Indexes of the ExchangeCode.
func (ExchangeCode) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("code"),
		index.Fields("is_active"),
	}
}
