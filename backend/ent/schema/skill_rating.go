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

// SkillRating holds the schema definition for the SkillRating entity.
// User ratings and reviews for marketplace skills.
type SkillRating struct {
	ent.Schema
}

func (SkillRating) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Table("skill_ratings"),
	}
}

// Fields of the SkillRating.
func (SkillRating) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Unique(),
		field.UUID("skill_id", uuid.UUID{}),
		field.UUID("user_id", uuid.UUID{}),
		field.Int("score").Min(1).Max(5),         // rating score 1-5
		field.String("comment").Optional(),        // review comment
		field.Time("created_at").Default(time.Now),
	}
}

// Edges of the SkillRating.
func (SkillRating) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("skill", Skill.Type).Ref("ratings").Field("skill_id").Unique().Required(),
	}
}

// Indexes of the SkillRating.
func (SkillRating) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("skill_id"),
		index.Fields("user_id", "skill_id").Unique(), // one rating per user per skill
	}
}
