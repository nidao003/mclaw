// Package usecase 数据 API 查询业务逻辑。聚合逻辑对齐 Java StationServiceImpl。
package usecase

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/samber/do"

	"github.com/nidao003/mclaw/backend/biz/data/model"
	"github.com/nidao003/mclaw/backend/biz/data/repo"
	"github.com/nidao003/mclaw/backend/domain"
	"github.com/nidao003/mclaw/backend/pkg/oohdata"
)

// errDataUnavailable 数据源未配置或不可用。
var errDataUnavailable = errors.New("data API unavailable: ooh_data not configured")

// 标签表配置（对应 Java RESIDENT_LABEL_TABLES / VISITOR_LABEL_TABLES，保持顺序）。
// 常驻 18 个标签 + 到访 5 个标签，表名 sw_station_label_<x>，字段 data_value / value_range。
var residentLabelTables = []labelEntry{
	{"性别标签", "sw_station_label_sex"},
	{"年龄标签", "sw_station_label_age"},
	{"婚姻标签", "sw_station_label_marriage"},
	{"消费标签", "sw_station_label_consume"},
	{"餐饮消费", "sw_station_label_catering_consumption"},
	{"餐饮单价", "sw_station_label_catering_price"},
	{"教育标签", "sw_station_label_education"},
	{"收入标签", "sw_station_label_income"},
	{"职业标签", "sw_station_label_occupation"},
	{"子女标签", "sw_station_label_children"},
	{"子女年龄", "sw_station_label_child_age"},
	{"房产标签", "sw_station_label_property"},
	{"手机价格", "sw_station_label_phone_price"},
	{"汽车标签", "sw_station_label_car"},
	{"运营商", "sw_station_label_carrier"},
	{"出行方式", "sw_station_label_travel"},
	{"工作行业", "sw_station_label_work"},
	{"业态偏好", "sw_station_label_business_preference"},
}

var visitorLabelTables = []labelEntry{
	{"性别标签", "sw_station_label_sex"},
	{"年龄标签", "sw_station_label_age"},
	{"婚姻标签", "sw_station_label_marriage"},
	{"教育标签", "sw_station_label_education"},
	{"工作行业", "sw_station_label_work"},
}

type labelEntry struct {
	name      string
	tableName string
}

type stationUsecase struct {
	repo   *repo.OohRepo
	redis  *redis.Client
	logger *slog.Logger
}

var _ domain.DataStationUsecase = (*stationUsecase)(nil)

// NewStationUsecase 构造车站查询用例。
// ooh_data 未配置时不报错（优雅降级），调用时 Available() 拦截返回 errDataUnavailable。
func NewStationUsecase(i *do.Injector) (domain.DataStationUsecase, error) {
	oohClient := do.MustInvoke[*oohdata.Client](i)
	r := repo.NewOohRepo(oohClient.DB())
	return &stationUsecase{
		repo:   r,
		redis:  do.MustInvoke[*redis.Client](i),
		logger: do.MustInvoke[*slog.Logger](i),
	}, nil
}

// stationCacheTTL 缓存时长（对齐 Java：画像 1h）
const stationCacheTTL = time.Hour

// GetStationDetail 车站完整画像（6 步聚合）。
func (uc *stationUsecase) GetStationDetail(ctx context.Context, stationID int64, durationID *int) (*model.StationVO, error) {
	if !uc.repo.Available() {
		return nil, errDataUnavailable
	}
	// 缓存 key 对齐 Java：stationId + durationId(0 表示 nil)
	dKey := 0
	if durationID != nil {
		dKey = *durationID
	}
	cacheKey := fmt.Sprintf("data:station:%d:d%d", stationID, dKey)
	if cached, ok := uc.cacheGetStation(ctx, cacheKey); ok {
		return cached, nil
	}

	// 1. 基础信息
	station, err := uc.repo.GetStationBase(ctx, stationID, durationID)
	if err != nil {
		return nil, err
	}
	if station == nil {
		return nil, nil
	}

	// 2. 人口（4 类）
	if station.ResidentPopulation, err = uc.repo.GetPopulation(ctx, stationID, 1, durationID); err != nil {
		return nil, err
	}
	visitor, err := uc.repo.GetPopulation(ctx, stationID, 2, durationID)
	if err != nil {
		return nil, err
	}
	if visitor != nil {
		visitor.NumberUnit = "人/月" // 到访人次单位（对齐 Java）
	}
	station.VisitorCount = visitor
	if station.WorkerPopulation, err = uc.repo.GetPopulation(ctx, stationID, 3, durationID); err != nil {
		return nil, err
	}
	if station.ResidentLiving, err = uc.repo.GetPopulation(ctx, stationID, 4, durationID); err != nil {
		return nil, err
	}

	// 3. 常驻 18 标签
	station.ResidentLabels = uc.queryLabels(ctx, stationID, residentLabelTables, 1, durationID)
	// 4. 到访 5 标签
	station.VisitorLabels = uc.queryLabels(ctx, stationID, visitorLabelTables, 2, durationID)

	// 5. 业态汇总
	if station.BusinessSummaries, err = uc.repo.GetBusinessSummaries(ctx, stationID, durationID); err != nil {
		return nil, err
	}

	// 6. 产业数据
	if station.IndustryData, err = uc.repo.GetIndustry(ctx, stationID, durationID); err != nil {
		return nil, err
	}

	_ = uc.cacheSet(ctx, cacheKey, station, stationCacheTTL)
	return station, nil
}

// GetPopulation 车站人口
func (uc *stationUsecase) GetPopulation(ctx context.Context, stationID int64, personType int, durationID *int) (*model.PopulationData, error) {
	if !uc.repo.Available() {
		return nil, errDataUnavailable
	}
	return uc.repo.GetPopulation(ctx, stationID, personType, durationID)
}

// GetLabels 车站标签分布
func (uc *stationUsecase) GetLabels(ctx context.Context, stationID int64, personType *int, durationID *int) (map[string][]model.LabelDistribution, error) {
	if !uc.repo.Available() {
		return nil, errDataUnavailable
	}
	result := make(map[string][]model.LabelDistribution, 23)
	if personType == nil || *personType == 1 {
		resident := uc.queryLabels(ctx, stationID, residentLabelTables, 1, durationID)
		if personType != nil {
			return resident, nil
		}
		for k, v := range resident {
			result["resident_"+k] = v
		}
	}
	if personType == nil || *personType == 2 {
		visitor := uc.queryLabels(ctx, stationID, visitorLabelTables, 2, durationID)
		if personType != nil {
			return visitor, nil
		}
		for k, v := range visitor {
			result["visitor_"+k] = v
		}
	}
	return result, nil
}

// GetBusiness 车站业态汇总
func (uc *stationUsecase) GetBusiness(ctx context.Context, stationID int64, durationID *int) ([]model.BusinessSummary, error) {
	if !uc.repo.Available() {
		return nil, errDataUnavailable
	}
	return uc.repo.GetBusinessSummaries(ctx, stationID, durationID)
}

// GetIndustry 车站产业数据
func (uc *stationUsecase) GetIndustry(ctx context.Context, stationID int64, durationID *int) (*model.IndustryData, error) {
	if !uc.repo.Available() {
		return nil, errDataUnavailable
	}
	return uc.repo.GetIndustry(ctx, stationID, durationID)
}

// SearchStations 车站搜索
func (uc *stationUsecase) SearchStations(ctx context.Context, stationName, cityName, cityCode string, limit int) ([]model.StationSearchResult, error) {
	if !uc.repo.Available() {
		return nil, errDataUnavailable
	}
	if stationName == "" {
		return nil, fmt.Errorf("车站名称不能为空")
	}
	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}
	return uc.repo.SearchStations(ctx, stationName, cityName, cityCode, limit)
}

// queryLabels 循环查询标签表分布（对应 Java queryLabelDistributions）。
// 单个标签失败不阻断整体，记日志返回空列表。
func (uc *stationUsecase) queryLabels(ctx context.Context, stationID int64, tables []labelEntry, personType int, durationID *int) map[string][]model.LabelDistribution {
	out := make(map[string][]model.LabelDistribution, len(tables))
	for _, e := range tables {
		dists, err := uc.repo.GetLabelDistribution(ctx, e.tableName, stationID, personType, durationID)
		if err != nil {
			uc.logger.WarnContext(ctx, "query label failed",
				"table", e.tableName, "stationId", stationID, "personType", personType, "error", err)
			out[e.name] = []model.LabelDistribution{}
			continue
		}
		out[e.name] = dists
	}
	return out
}

// cacheGetStation / cacheSet Redis JSON 缓存辅助
func (uc *stationUsecase) cacheGetStation(ctx context.Context, key string) (*model.StationVO, bool) {
	if uc.redis == nil {
		return nil, false
	}
	val, err := uc.redis.Get(ctx, key).Bytes()
	if err != nil {
		return nil, false
	}
	var v model.StationVO
	if err := json.Unmarshal(val, &v); err != nil {
		return nil, false
	}
	return &v, true
}

func (uc *stationUsecase) cacheSet(ctx context.Context, key string, val any, ttl time.Duration) error {
	if uc.redis == nil {
		return nil
	}
	b, err := json.Marshal(val)
	if err != nil {
		return err
	}
	return uc.redis.Set(ctx, key, b, ttl).Err()
}
