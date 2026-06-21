package domain

import (
	"context"

	"github.com/nidao003/mclaw/backend/biz/data/model"
)

// DataStationUsecase 车站数据查询用例。
type DataStationUsecase interface {
	// GetStationDetail 车站完整画像（6 步聚合）。durationID 为 nil 取最新季度。
	GetStationDetail(ctx context.Context, stationID int64, durationID *int) (*model.StationVO, error)
	// GetPopulation 车站人口数据。personType: 1常驻 2到访 3工作 4居住
	GetPopulation(ctx context.Context, stationID int64, personType int, durationID *int) (*model.PopulationData, error)
	// GetLabels 车站人群标签分布。personType: nil=全部(带前缀), 1=常驻, 2=到访
	GetLabels(ctx context.Context, stationID int64, personType *int, durationID *int) (map[string][]model.LabelDistribution, error)
	// GetBusiness 车站业态汇总
	GetBusiness(ctx context.Context, stationID int64, durationID *int) ([]model.BusinessSummary, error)
	// GetIndustry 车站产业数据
	GetIndustry(ctx context.Context, stationID int64, durationID *int) (*model.IndustryData, error)
	// SearchStations 车站名模糊搜索。limit 默认 10，上限 50。
	SearchStations(ctx context.Context, stationName, cityName, cityCode string, limit int) ([]model.StationSearchResult, error)
}

// DataCityUsecase 城市数据查询用例。
type DataCityUsecase interface {
	// GetCityDetail 城市基本信息
	GetCityDetail(ctx context.Context, cityCode string) (*model.CityVO, error)
	// GetCityAllRecords 城市全部历史
	GetCityAllRecords(ctx context.Context, cityCode string) ([]model.CityVO, error)
	// GetPassengerFlow 城市客流。yearMonth 为空返回最新一天，否则返回当月每日
	GetPassengerFlow(ctx context.Context, cityCode, yearMonth string) (*model.PassengerFlowVO, error)
	// GetTopFlow 城市历史最高客流
	GetTopFlow(ctx context.Context, cityCode string) (map[string]any, error)
	// GetYearlyFlow 城市历年日均客流
	GetYearlyFlow(ctx context.Context, cityCode string) ([]map[string]any, error)
	// GetCityLines 城市线路列表
	GetCityLines(ctx context.Context, cityCode string) ([]model.LineSimpleVO, error)
	// GetCityStations 城市车站列表（分页）
	GetCityStations(ctx context.Context, cityCode string, page, pageSize int) (map[string]any, error)
	// GetCityDurations 城市季度可用性。cityCode 为空返回所有城市
	GetCityDurations(ctx context.Context, cityCode string) ([]model.CityDurationVO, error)
}

// DataLineUsecase 线路数据查询用例。
type DataLineUsecase interface {
	// GetLineDetail 线路详情（lineID 支持 id 或 original_line_id）
	GetLineDetail(ctx context.Context, lineID int64) (*model.LineVO, error)
	// GetLineStations 线路所有车站（按 sequence）
	GetLineStations(ctx context.Context, lineID int64) ([]model.StationSimpleVO, error)
}

// DataBusinessUsecase 业态数据查询用例。
type DataBusinessUsecase interface {
	// GetStationBusinessList 车站业态配套列表（BusinessVO）
	GetStationBusinessList(ctx context.Context, stationID int64, durationID *int, limit int) ([]model.BusinessVO, error)
	// GetBusinessDetail 车站业态详情
	GetBusinessDetail(ctx context.Context, stationID int64, durationID *int, industryID *int64, keyword string, limit int) ([]model.BusinessDetailVO, error)
}

