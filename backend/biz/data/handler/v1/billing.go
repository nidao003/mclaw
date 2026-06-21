// Package v1 数据 API HTTP 处理器 + 计费中间件。
package v1

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/GoYoko/web"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/samber/do"

	"github.com/nidao003/mclaw/backend/consts"
	"github.com/nidao003/mclaw/backend/db"
	"github.com/nidao003/mclaw/backend/db/dataapipricing"
	"github.com/nidao003/mclaw/backend/domain"
	"github.com/nidao003/mclaw/backend/errcode"
	"github.com/nidao003/mclaw/backend/middleware"
)

// routeAPICode 路由路径 → api_code 映射（与 data_api_pricings 表 seed 对应）。
var routeAPICode = map[string]string{
	"/api/v1/data/stations/search":               "query.search_stations",
	"/api/v1/data/stations/:id":                  "station.detail",
	"/api/v1/data/stations/:id/population":       "station.population",
	"/api/v1/data/stations/:id/labels":           "station.labels",
	"/api/v1/data/stations/:id/business":         "station.business",
	"/api/v1/data/stations/:id/industry":         "station.industry",
	"/api/v1/data/stations/:id/business-summary": "business.summary",
	"/api/v1/data/stations/:id/business-detail":  "business.detail",
	"/api/v1/data/cities/durations":              "query.city_durations",
	"/api/v1/data/cities/:code":                  "city.detail",
	"/api/v1/data/cities/:code/all":              "city.all",
	"/api/v1/data/cities/:code/passenger-flow":   "city.passenger_flow",
	"/api/v1/data/cities/:code/top-flow":         "city.top_flow",
	"/api/v1/data/cities/:code/yearly-flow":      "city.yearly_flow",
	"/api/v1/data/cities/:code/lines":            "city.lines",
	"/api/v1/data/cities/:code/stations":         "city.stations",
	"/api/v1/data/lines/:id":                     "line.detail",
	"/api/v1/data/lines/:id/stations":            "line.stations",
}

// BillingMiddleware 数据 API 按次计费中间件。
// 流程：识别 api_code → 余额预检 → 执行业务 → 成功后扣 credit → 记用量。
type BillingMiddleware struct {
	entClient    *db.Client
	walletUc     domain.WalletUsecase
	pricingCache sync.Map // api_code → int64(credits)，进程内缓存
	logger       *slog.Logger
}

// NewBillingMiddleware 构造计费中间件。
func NewBillingMiddleware(i *do.Injector) (*BillingMiddleware, error) {
	return &BillingMiddleware{
		entClient: do.MustInvoke[*db.Client](i),
		walletUc:  do.MustInvoke[domain.WalletUsecase](i),
		logger:    do.MustInvoke[*slog.Logger](i).With("module", "billing.data_api"),
	}, nil
}

// Middleware 返回 echo 计费中间件。须在 ApiKeyAuth 之后挂载（依赖 GetUser）。
func (m *BillingMiddleware) Middleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			apiCode, ok := routeAPICode[c.Path()]
			if !ok {
				// 未配置计费的接口直接放行（如 /data/docs 文档接口）
				return next(c)
			}

			start := time.Now()
			user := middleware.GetUser(c)
			if user == nil {
				return errcode.ErrUnauthorized
			}

			// 查单价（查不到容错为 0，不阻断业务）
			credits, err := m.getCredits(c.Request().Context(), apiCode)
			if err != nil {
				m.logger.WarnContext(c.Request().Context(), "get pricing failed, skip billing", "apiCode", apiCode, "error", err)
				credits = 0
			}

			// 余额预检（credits>0 时）
			if credits > 0 {
				wallet, wErr := m.walletUc.Get(c.Request().Context(), user.ID)
				if wErr != nil {
					return wErr
				}
				if wallet.Balance < credits {
					return errcode.ErrDataApiInsufficientCredit
				}
			}

			// 执行业务
			bizErr := next(c)

			// 成功才计费（HTTP 2xx）
			success := bizErr == nil && c.Response().Status < 400
			if success && credits > 0 {
				refID := c.Param("id")
				if refID == "" {
					refID = c.Param("code")
				}
				if dErr := m.walletUc.Deduct(c.Request().Context(), user.ID,
					consts.TransactionDataApiConsumption, credits,
					"数据API: "+apiCode, refID); dErr != nil {
					m.logger.WarnContext(c.Request().Context(), "deduct failed", "apiCode", apiCode, "userID", user.ID, "error", dErr)
				}
			}

			// 用量记录（阶段1先日志，后续接 ClickHouse data_api_usage_events）
			m.recordUsage(c.Request().Context(), user.ID, apiCode, credits, time.Since(start), success, bizErr)

			return bizErr
		}
	}
}

// getCredits 查 api_code 单价（进程内缓存）。
func (m *BillingMiddleware) getCredits(ctx context.Context, apiCode string) (int64, error) {
	if v, ok := m.pricingCache.Load(apiCode); ok {
		return v.(int64), nil
	}
	p, err := m.entClient.DataApiPricing.Query().
		Where(dataapipricing.APICode(apiCode)).
		Only(ctx)
	if err != nil {
		return 0, err
	}
	if !p.Enabled {
		m.pricingCache.Store(apiCode, int64(0))
		return 0, nil
	}
	m.pricingCache.Store(apiCode, p.CreditsPerCall)
	return p.CreditsPerCall, nil
}

// InvalidateCache 清除单价缓存（后台改单价后调用）。
func (m *BillingMiddleware) InvalidateCache() {
	m.pricingCache.Range(func(k, _ any) bool {
		m.pricingCache.Delete(k)
		return true
	})
}

// recordUsage 记录用量（阶段1先日志，后续接 ClickHouse）。
func (m *BillingMiddleware) recordUsage(ctx context.Context, userID uuid.UUID, apiCode string, credits int64, latency time.Duration, success bool, bizErr error) {
	errMsg := ""
	if bizErr != nil {
		errMsg = bizErr.Error()
	}
	m.logger.InfoContext(ctx, "data api usage",
		"userID", userID, "apiCode", apiCode, "credits", credits,
		"latencyMs", latency.Milliseconds(), "success", success, "error", errMsg)
}

// 确保引入 web（handler 文件用到）
var _ = web.BaseHandler
