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

// UserApiKey holds the schema definition for the UserApiKey entity.
// API keys that allow external access to the SkillHub API.
type UserApiKey struct {
	ent.Schema
}

func (UserApiKey) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Table("user_api_keys"),
	}
}

// Fields of the UserApiKey.
func (UserApiKey) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Unique(),
		field.UUID("user_id", uuid.UUID{}),
		field.String("key_hash").NotEmpty().Unique(),   // SHA-256 hash of the key
		field.String("key_prefix").NotEmpty(),           // first 12 chars for display
		field.String("name").NotEmpty(),                 // user-given name
		field.Time("last_used_at").Optional(),
		field.Time("expires_at").Optional(),
		field.Bool("is_active").Default(true),
		field.Time("created_at").Default(time.Now),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

// Indexes of the UserApiKey.
func (UserApiKey) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id"),
		index.Fields("key_hash").Unique(),
		index.Fields("is_active"),
	}
}

// Edges of the UserApiKey.
func (UserApiKey) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).
			Ref("api_keys").
			Field("user_id").
			Unique().
			Required(),
	}
}
