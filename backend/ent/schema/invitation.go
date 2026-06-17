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

// Invitation holds the schema definition for the Invitation entity.
// Records invitation relationships and rewards.
type Invitation struct {
	ent.Schema
}

func (Invitation) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Table("invitations"),
	}
}

// Fields of the Invitation.
func (Invitation) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Unique(),
		field.UUID("inviter_id", uuid.UUID{}),   // user who invited
		field.UUID("invitee_id", uuid.UUID{}),   // user who was invited
		field.Int64("reward").Default(5000),      // credits reward for inviter
		field.Time("created_at").Default(time.Now),
	}
}

// Indexes of the Invitation.
func (Invitation) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("inviter_id"),
		index.Fields("invitee_id").Unique(), // each user can only be invited once
	}
}
