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

// DataApiPricing 数据 API 按次计费单价 + 接口文档元数据。
// 一行对应一个数据查询接口：既存计费单价（credits_per_call），也存 API 文档页所需的元数据。
type DataApiPricing struct {
	ent.Schema
}

func (DataApiPricing) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Table("data_api_pricings"),
	}
}

// Fields of the DataApiPricing.
func (DataApiPricing) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Unique(),
		field.String("api_code").Unique().NotEmpty(),           // 接口标识，如 station.detail
		field.String("name").NotEmpty(),                        // 接口中文名，如「查询车站画像」
		field.String("group").Default("车站画像"),               // 一级分组：车站画像（后续扩展线路画像/城市画像等）
		field.String("category").NotEmpty(),                    // 二级分类：画像/城市/线路/业态/查询
		field.String("method").Default("GET"),                  // HTTP 方法
		field.String("path").NotEmpty(),                        // 接口路径，如 /api/v1/data/stations/:id
		field.String("summary").Optional(),                     // 一句话描述
		field.Text("description").Optional(),                   // 详细说明
		field.Int64("credits_per_call").Default(1),             // 每次调用扣减的 credit（按次计费）
		field.Bool("enabled").Default(true),                    // 是否启用
		field.Bool("need_api_key").Default(true),               // 是否需要 API Key（文档页展示）
		field.JSON("params", []map[string]any{}).Optional(),    // 请求参数表 [{name,type,required,desc,example}]
		field.JSON("response_fields", []map[string]any{}).Optional(), // 响应字段表 [{field,type,desc,example}]
		field.Text("example_request").Optional(),               // curl 请求示例
		field.Text("example_response").Optional(),              // JSON 响应示例
		field.Int("sort_order").Default(0),                     // 分类内排序
		field.Time("created_at").Default(time.Now),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

// Indexes of the DataApiPricing.
func (DataApiPricing) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("group"),
		index.Fields("category"),
		index.Fields("enabled"),
	}
}
