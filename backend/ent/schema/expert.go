package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"

	"github.com/google/uuid"

	"github.com/nidao003/mclaw/backend/pkg/entx"
)

// Expert holds the schema definition for the Expert entity.
// Industry experts for the metro resource management platform.
type Expert struct {
	ent.Schema
}

func (Expert) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Table("experts"),
	}
}

func (Expert) Mixin() []ent.Mixin {
	return []ent.Mixin{
		entx.SoftDeleteMixin2{},
	}
}

// Fields of the Expert.
func (Expert) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Unique(),
		field.String("slug").Unique().NotEmpty(),             // URL-friendly identifier
		field.String("name").NotEmpty(),                       // display name
		field.String("subtitle").Default(""),                  // one-line positioning
		field.Text("description").Optional(),                  // detailed introduction
		field.String("icon").Default(""),                      // lucide-react icon name
		field.JSON("scenarios", []string{}).Optional(),        // applicable scenarios
		field.JSON("related_skills", []string{}).Optional(),   // related skill slugs
		field.String("status").Default("published"),           // draft, published, archived
		field.Int("sort_order").Default(0),                    // display order
		field.Time("created_at").Default(time.Now),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

// Edges of the Expert.
func (Expert) Edges() []ent.Edge {
	return nil
}

// Indexes of the Expert.
func (Expert) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("slug"),
		index.Fields("status"),
	}
}
