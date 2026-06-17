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

// CheckIn holds the schema definition for the CheckIn entity.
// Records daily check-in events for credit rewards.
type CheckIn struct {
	ent.Schema
}

func (CheckIn) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Table("check_ins"),
	}
}

// Fields of the CheckIn.
func (CheckIn) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Unique(),
		field.UUID("user_id", uuid.UUID{}),
		field.Time("checked_at"),            // the date of check-in
		field.Int64("reward").Default(100),   // credits earned from this check-in
		field.Time("created_at").Default(time.Now),
	}
}

// Indexes of the CheckIn.
func (CheckIn) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id", "checked_at").Unique(), // one check-in per user per day
	}
}
