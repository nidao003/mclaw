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

// CityLineBizHandler 城市/线路/业态查询处理器。
type CityLineBizHandler struct {
	cityUc     domain.DataCityUsecase
	lineUc     domain.DataLineUsecase
	businessUc domain.DataBusinessUsecase
}

// NewCityLineBizHandler 构造并注册路由（挂在已有的 /api/v1/data 路由组下需复用 billing）。
// 由于 echo 路由组在 StationHandler 已创建，这里通过单独 Group 复用同样的中间件。
func NewCityLineBizHandler(i *do.Injector) (*CityLineBizHandler, error) {
	w := do.MustInvoke[*web.Web](i)
	auth := do.MustInvoke[*middleware.AuthMiddleware](i)
	billing := do.MustInvoke[*BillingMiddleware](i)

	h := &CityLineBizHandler{
		cityUc:     do.MustInvoke[domain.DataCityUsecase](i),
		lineUc:     do.MustInvoke[domain.DataLineUsecase](i),
		businessUc: do.MustInvoke[domain.DataBusinessUsecase](i),
	}

	// 复用 /api/v1/data 路由组（ApiKeyAuth + billing）
	g := w.Group("/api/v1/data", auth.ApiKeyAuth(), billing.Middleware())

	// 城市
	g.GET("/cities/durations", web.BaseHandler(h.GetCityDurations))
	g.GET("/cities/:code", web.BaseHandler(h.GetCityDetail))
	g.GET("/cities/:code/all", web.BaseHandler(h.GetCityAllRecords))
	g.GET("/cities/:code/passenger-flow", web.BaseHandler(h.GetPassengerFlow))
	g.GET("/cities/:code/top-flow", web.BaseHandler(h.GetTopFlow))
	g.GET("/cities/:code/yearly-flow", web.BaseHandler(h.GetYearlyFlow))
	g.GET("/cities/:code/lines", web.BaseHandler(h.GetCityLines))
	g.GET("/cities/:code/stations", web.BaseHandler(h.GetCityStations))

	// 线路
	g.GET("/lines/:id", web.BaseHandler(h.GetLineDetail))
	g.GET("/lines/:id/stations", web.BaseHandler(h.GetLineStations))

	// 业态（BusinessController，区别于 station.business）
	g.GET("/stations/:id/business-summary", web.BaseHandler(h.GetBusinessSummary))
	g.GET("/stations/:id/business-detail", web.BaseHandler(h.GetBusinessDetail))

	return h, nil
}

// ---- 城市 ----

func (h *CityLineBizHandler) GetCityDetail(c *web.Context) error {
	code := c.Param("code")
	if code == "" {
		return errcode.ErrDataApiInvalidParam
	}
	v, err := h.cityUc.GetCityDetail(c.Request().Context(), code)
	if err != nil {
		return err
	}
	if v == nil {
		return errcode.ErrDataApiStationNotFound
	}
	return c.Success(v)
}

func (h *CityLineBizHandler) GetCityAllRecords(c *web.Context) error {
	code := c.Param("code")
	v, err := h.cityUc.GetCityAllRecords(c.Request().Context(), code)
	if err != nil {
		return err
	}
	return c.Success(v)
}

func (h *CityLineBizHandler) GetPassengerFlow(c *web.Context) error {
	code := c.Param("code")
	yearMonth := c.QueryParam("yearMonth")
	v, err := h.cityUc.GetPassengerFlow(c.Request().Context(), code, yearMonth)
	if err != nil {
		return err
	}
	return c.Success(v)
}

func (h *CityLineBizHandler) GetTopFlow(c *web.Context) error {
	code := c.Param("code")
	v, err := h.cityUc.GetTopFlow(c.Request().Context(), code)
	if err != nil {
		return err
	}
	return c.Success(v)
}

func (h *CityLineBizHandler) GetYearlyFlow(c *web.Context) error {
	code := c.Param("code")
	v, err := h.cityUc.GetYearlyFlow(c.Request().Context(), code)
	if err != nil {
		return err
	}
	return c.Success(v)
}

func (h *CityLineBizHandler) GetCityLines(c *web.Context) error {
	code := c.Param("code")
	v, err := h.cityUc.GetCityLines(c.Request().Context(), code)
	if err != nil {
		return err
	}
	return c.Success(v)
}

func (h *CityLineBizHandler) GetCityStations(c *web.Context) error {
	code := c.Param("code")
	page := 1
	pageSize := 50
	if p := c.QueryParam("page"); p != "" {
		if n, err := strconv.Atoi(p); err == nil {
			page = n
		}
	}
	if ps := c.QueryParam("pageSize"); ps != "" {
		if n, err := strconv.Atoi(ps); err == nil {
			pageSize = n
		}
	}
	v, err := h.cityUc.GetCityStations(c.Request().Context(), code, page, pageSize)
	if err != nil {
		return err
	}
	return c.Success(v)
}

func (h *CityLineBizHandler) GetCityDurations(c *web.Context) error {
	code := strings.TrimSpace(c.QueryParam("cityCode"))
	v, err := h.cityUc.GetCityDurations(c.Request().Context(), code)
	if err != nil {
		return err
	}
	return c.Success(v)
}

// ---- 线路 ----

func (h *CityLineBizHandler) GetLineDetail(c *web.Context) error {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		return errcode.ErrDataApiInvalidParam
	}
	v, err := h.lineUc.GetLineDetail(c.Request().Context(), id)
	if err != nil {
		return err
	}
	if v == nil {
		return errcode.ErrDataApiStationNotFound
	}
	return c.Success(v)
}

func (h *CityLineBizHandler) GetLineStations(c *web.Context) error {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		return errcode.ErrDataApiInvalidParam
	}
	v, err := h.lineUc.GetLineStations(c.Request().Context(), id)
	if err != nil {
		return err
	}
	return c.Success(v)
}

// ---- 业态 ----

func (h *CityLineBizHandler) GetBusinessSummary(c *web.Context) error {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		return errcode.ErrDataApiInvalidParam
	}
	durID, err := parseDurationID(c.QueryParam("durationId"))
	if err != nil {
		return errcode.ErrDataApiInvalidParam
	}
	limit := 100
	if l := c.QueryParam("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil {
			limit = n
		}
	}
	v, err := h.businessUc.GetStationBusinessList(c.Request().Context(), id, durID, limit)
	if err != nil {
		return err
	}
	return c.Success(v)
}

func (h *CityLineBizHandler) GetBusinessDetail(c *web.Context) error {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		return errcode.ErrDataApiInvalidParam
	}
	durID, err := parseDurationID(c.QueryParam("durationId"))
	if err != nil {
		return errcode.ErrDataApiInvalidParam
	}
	var industryID *int64
	if it := c.QueryParam("industryType"); it != "" {
		v, err := strconv.ParseInt(it, 10, 64)
		if err != nil {
			return errcode.ErrDataApiInvalidParam
		}
		industryID = &v
	}
	keyword := c.QueryParam("keyword")
	limit := 100
	if l := c.QueryParam("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil {
			limit = n
		}
	}
	v, err := h.businessUc.GetBusinessDetail(c.Request().Context(), id, durID, industryID, keyword, limit)
	if err != nil {
		return err
	}
	return c.Success(v)
}
