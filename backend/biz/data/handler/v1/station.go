package v1

import (
	"strconv"
	"strings"

	"github.com/GoYoko/web"
	"github.com/samber/do"

	"github.com/nidao003/mclaw/backend/domain"
	"github.com/nidao003/mclaw/backend/errcode"
	"github.com/nidao003/mclaw/backend/middleware"
)

// StationHandler 车站数据查询处理器。
type StationHandler struct {
	uc domain.DataStationUsecase
}

// NewStationHandler 构造并注册路由。须在 ApiKeyAuth + Billing 之后挂载。
func NewStationHandler(i *do.Injector) (*StationHandler, error) {
	w := do.MustInvoke[*web.Web](i)
	auth := do.MustInvoke[*middleware.AuthMiddleware](i)
	billing := do.MustInvoke[*BillingMiddleware](i)
	uc := do.MustInvoke[domain.DataStationUsecase](i)

	h := &StationHandler{uc: uc}

	// 数据 API 路由组：ApiKeyAuth 鉴权 + 按次计费
	g := w.Group("/api/v1/data", auth.ApiKeyAuth(), billing.Middleware())

	// 车站
	g.GET("/stations/search", web.BaseHandler(h.SearchStations))
	g.GET("/stations/:id", web.BaseHandler(h.GetStation))
	g.GET("/stations/:id/population", web.BaseHandler(h.GetPopulation))
	g.GET("/stations/:id/labels", web.BaseHandler(h.GetLabels))
	g.GET("/stations/:id/business", web.BaseHandler(h.GetBusiness))
	g.GET("/stations/:id/industry", web.BaseHandler(h.GetIndustry))

	// 业态（BusinessController，区别于 station.business）— 阶段2 实现，先占位注册
	// g.GET("/stations/:id/business-summary", ...)
	// g.GET("/stations/:id/business-detail", ...)

	// 文档接口（公开免鉴权，阶段3 实现）
	// w.GET("/api/v1/data/docs", web.BaseHandler(h.Docs))

	return h, nil
}

// parseStationID 解析车站 ID（原始 ID，大整数）
func parseStationID(s string) (int64, error) {
	return strconv.ParseInt(s, 10, 64)
}

// parseDurationID 解析可选季度 ID（空字符串返回 nil）
func parseDurationID(s string) (*int, error) {
	if s == "" {
		return nil, nil
	}
	d, err := strconv.Atoi(s)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

// GetStation 车站完整画像
func (h *StationHandler) GetStation(c *web.Context) error {
	id, err := parseStationID(c.Param("id"))
	if err != nil {
		return errcode.ErrDataApiInvalidParam
	}
	durID, err := parseDurationID(c.QueryParam("durationId"))
	if err != nil {
		return errcode.ErrDataApiInvalidParam
	}
	station, err := h.uc.GetStationDetail(c.Request().Context(), id, durID)
	if err != nil {
		return err
	}
	if station == nil {
		return errcode.ErrDataApiStationNotFound
	}
	return c.Success(station)
}

// GetPopulation 车站人口
func (h *StationHandler) GetPopulation(c *web.Context) error {
	id, err := parseStationID(c.Param("id"))
	if err != nil {
		return errcode.ErrDataApiInvalidParam
	}
	durID, err := parseDurationID(c.QueryParam("durationId"))
	if err != nil {
		return errcode.ErrDataApiInvalidParam
	}
	personType := 1
	if pt := c.QueryParam("personType"); pt != "" {
		if personType, err = strconv.Atoi(pt); err != nil {
			return errcode.ErrDataApiInvalidParam
		}
	}
	data, err := h.uc.GetPopulation(c.Request().Context(), id, personType, durID)
	if err != nil {
		return err
	}
	return c.Success(data)
}

// GetLabels 车站标签分布
func (h *StationHandler) GetLabels(c *web.Context) error {
	id, err := parseStationID(c.Param("id"))
	if err != nil {
		return errcode.ErrDataApiInvalidParam
	}
	durID, err := parseDurationID(c.QueryParam("durationId"))
	if err != nil {
		return errcode.ErrDataApiInvalidParam
	}
	var personType *int
	if pt := c.QueryParam("personType"); pt != "" {
		v, err := strconv.Atoi(pt)
		if err != nil {
			return errcode.ErrDataApiInvalidParam
		}
		personType = &v
	}
	data, err := h.uc.GetLabels(c.Request().Context(), id, personType, durID)
	if err != nil {
		return err
	}
	return c.Success(data)
}

// GetBusiness 车站业态汇总
func (h *StationHandler) GetBusiness(c *web.Context) error {
	id, err := parseStationID(c.Param("id"))
	if err != nil {
		return errcode.ErrDataApiInvalidParam
	}
	durID, err := parseDurationID(c.QueryParam("durationId"))
	if err != nil {
		return errcode.ErrDataApiInvalidParam
	}
	data, err := h.uc.GetBusiness(c.Request().Context(), id, durID)
	if err != nil {
		return err
	}
	return c.Success(data)
}

// GetIndustry 车站产业数据
func (h *StationHandler) GetIndustry(c *web.Context) error {
	id, err := parseStationID(c.Param("id"))
	if err != nil {
		return errcode.ErrDataApiInvalidParam
	}
	durID, err := parseDurationID(c.QueryParam("durationId"))
	if err != nil {
		return errcode.ErrDataApiInvalidParam
	}
	data, err := h.uc.GetIndustry(c.Request().Context(), id, durID)
	if err != nil {
		return err
	}
	return c.Success(data)
}

// SearchStations 车站搜索
func (h *StationHandler) SearchStations(c *web.Context) error {
	name := strings.TrimSpace(c.QueryParam("name"))
	if name == "" {
		name = strings.TrimSpace(c.QueryParam("stationName"))
	}
	if name == "" {
		return errcode.ErrDataApiInvalidParam
	}
	cityName := c.QueryParam("cityName")
	cityCode := c.QueryParam("cityCode")
	limit := 10
	if l := c.QueryParam("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil {
			limit = n
		}
	}
	data, err := h.uc.SearchStations(c.Request().Context(), name, cityName, cityCode, limit)
	if err != nil {
		return err
	}
	return c.Success(data)
}
