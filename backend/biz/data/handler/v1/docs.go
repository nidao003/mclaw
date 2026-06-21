package v1

import (
	"github.com/GoYoko/web"
	"github.com/samber/do"

	"github.com/nidao003/mclaw/backend/db"
	"github.com/nidao003/mclaw/backend/db/dataapipricing"
)

// DocsHandler API 文档元数据查询（公开免鉴权）。
type DocsHandler struct {
	entClient *db.Client
}

// NewDocsHandler 构造并注册公开文档路由。
func NewDocsHandler(i *do.Injector) (*DocsHandler, error) {
	w := do.MustInvoke[*web.Web](i)
	h := &DocsHandler{entClient: do.MustInvoke[*db.Client](i)}
	// 文档接口公开免鉴权（不挂 ApiKeyAuth/billing）
	w.GET("/api/v1/data/docs", web.BaseHandler(h.GetDocs))
	return h, nil
}

// apiDocItem 文档项（给前端 API 文档页渲染用）
type apiDocItem struct {
	APICode         string                   `json:"apiCode"`
	Name            string                   `json:"name"`
	Group           string                   `json:"group"`
	Category        string                   `json:"category"`
	Method          string                   `json:"method"`
	Path            string                   `json:"path"`
	Summary         string                   `json:"summary"`
	Description     string                   `json:"description"`
	CreditsPerCall  int64                    `json:"creditsPerCall"`
	NeedAPIKey      bool                     `json:"needApiKey"`
	Params          []map[string]interface{} `json:"params"`
	ResponseFields  []map[string]interface{} `json:"responseFields"`
	ExampleRequest  string                   `json:"exampleRequest"`
	ExampleResponse string                   `json:"exampleResponse"`
	SortOrder       int                      `json:"sortOrder"`
}

// GetDocs 返回所有启用接口的文档元数据，按一级 group → 二级 category 两级分组。
func (h *DocsHandler) GetDocs(c *web.Context) error {
	list, err := h.entClient.DataApiPricing.Query().
		Where(dataapipricing.EnabledEQ(true)).
		Order(dataapipricing.BySortOrder()).
		All(c.Request().Context())
	if err != nil {
		return err
	}

	// group(一级) → []subGroup(二级，按出现顺序保序)
	type subGroup struct {
		category string
		apis     []apiDocItem
	}
	groupOrder := []string{}
	groups := make(map[string][]subGroup)

	for _, p := range list {
		item := apiDocItem{
			APICode:         p.APICode,
			Name:            p.Name,
			Group:           p.Group,
			Category:        p.Category,
			Method:          p.Method,
			Path:            p.Path,
			Summary:         p.Summary,
			Description:     p.Description,
			CreditsPerCall:  p.CreditsPerCall,
			NeedAPIKey:      p.NeedAPIKey,
			Params:          p.Params,
			ResponseFields:  p.ResponseFields,
			ExampleRequest:  p.ExampleRequest,
			ExampleResponse: p.ExampleResponse,
			SortOrder:       p.SortOrder,
		}

		g := p.Group
		if _, ok := groups[g]; !ok {
			groupOrder = append(groupOrder, g)
			groups[g] = []subGroup{}
		}

		// 找到该 group 下对应的二级 subGroup（按出现顺序保序）
		var sg *subGroup
		for i := range groups[g] {
			if groups[g][i].category == p.Category {
				sg = &groups[g][i]
				break
			}
		}
		if sg == nil {
			groups[g] = append(groups[g], subGroup{category: p.Category})
			sg = &groups[g][len(groups[g])-1]
		}
		sg.apis = append(sg.apis, item)
	}

	// 按出现顺序组装一级 group → 二级 subGroups
	result := make([]map[string]any, 0, len(groupOrder))
	for _, g := range groupOrder {
		subs := groups[g]
		subResult := make([]map[string]any, 0, len(subs))
		for _, s := range subs {
			subResult = append(subResult, map[string]any{
				"category": s.category,
				"apis":     s.apis,
			})
		}
		result = append(result, map[string]any{
			"group":     g,
			"subGroups": subResult,
		})
	}

	return c.Success(map[string]any{
		"baseUrl":    "", // 前端用相对路径 / 配置的 API host
		"authHeader": "X-API-Key",
		"groups":     result,
	})
}
