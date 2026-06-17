package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// SkillReview holds the schema definition for the SkillReview entity.
// Admin review records for skill publishing.
type SkillReview struct {
	ent.Schema
}

func (SkillReview) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Table("skill_reviews"),
	}
}

// Fields of the SkillReview.
func (SkillReview) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Unique(),
		field.UUID("skill_id", uuid.UUID{}),
		field.UUID("reviewer_id", uuid.UUID{}),   // admin who reviewed
		field.String("status").Default("pending"), // approved, rejected, pending
		field.String("comment").Optional(),        // review comment
		field.Time("created_at").Default(time.Now),
	}
}

// Edges of the SkillReview.
func (SkillReview) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("skill", Skill.Type).Ref("reviews").Field("skill_id").Unique().Required(),
	}
}

// Indexes of the SkillReview.
func (SkillReview) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("skill_id"),
		index.Fields("status"),
	}
}
