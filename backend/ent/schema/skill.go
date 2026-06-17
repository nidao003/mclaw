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

	"github.com/nidao003/mclaw/backend/pkg/entx"
)

// Skill holds the schema definition for the Skill entity.
// Marketplace skill definition with versioning and ratings.
type Skill struct {
	ent.Schema
}

func (Skill) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Table("skills"),
	}
}

func (Skill) Mixin() []ent.Mixin {
	return []ent.Mixin{
		entx.SoftDeleteMixin2{},
	}
}

// Fields of the Skill.
func (Skill) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Unique(),
		field.UUID("author_id", uuid.UUID{}),                    // skill author
		field.String("name").NotEmpty(),                          // skill display name
		field.String("skill_id").Unique().NotEmpty(),             // unique skill identifier
		field.String("description").Optional(),                   // skill description
		field.JSON("categories", []string{}).Optional(),          // category tags
		field.JSON("tags", []string{}).Optional(),                // search tags
		field.String("icon").Optional(),                          // icon URL
		field.Text("content").Optional(),                         // skill content/config
		field.JSON("args_schema", map[string]any{}).Optional(),   // argument JSON schema
		field.String("status").Default("draft"),  // draft|pending_review|published|archived|disabled|rejected
		field.Int("install_count").Default(0),                    // total installations
		field.Float("rating_avg").Default(0),                     // average rating
		field.Int("rating_count").Default(0),                     // total ratings
		// V2 新增字段
		field.String("source_type").Default("official"),          // official | third_party
		field.String("icon_name").Optional(),                      // 预设图标名称
		field.String("summary").Optional(),                        // 技能简介
		field.String("minio_path").Optional(),                     // RustFS/S3 存储路径前缀
		field.String("npm_publish_status").Default("pending"),     // pending|publishing|published|failed
		field.Time("created_at").Default(time.Now),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

// Edges of the Skill.
func (Skill) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("versions", SkillVersion.Type),
		edge.To("reviews", SkillReview.Type),
		edge.To("ratings", SkillRating.Type),
	}
}

// Indexes of the Skill.
func (Skill) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("skill_id"),
		index.Fields("author_id"),
		index.Fields("status"),
		index.Fields("source_type"),
		index.Fields("author_id", "status"),
	}
}
