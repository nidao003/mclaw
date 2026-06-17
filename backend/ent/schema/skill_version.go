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

// SkillVersion holds the schema definition for the SkillVersion entity.
// Version history for marketplace skills.
type SkillVersion struct {
	ent.Schema
}

func (SkillVersion) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Table("skill_versions"),
	}
}

// Fields of the SkillVersion.
func (SkillVersion) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Unique(),
		field.UUID("skill_id", uuid.UUID{}),
		field.String("version").NotEmpty(),      // semantic version (e.g. "1.0.0")
		field.Text("content").Optional(),         // version content/config
		field.String("changelog").Optional(),     // version changelog
		field.Time("created_at").Default(time.Now),
	}
}

// Edges of the SkillVersion.
func (SkillVersion) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("skill", Skill.Type).Ref("versions").Field("skill_id").Unique().Required(),
	}
}

// Indexes of the SkillVersion.
func (SkillVersion) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("skill_id", "version").Unique(), // unique version per skill
	}
}
