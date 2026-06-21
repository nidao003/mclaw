package usecase

import (
	"context"
	"fmt"

	"github.com/samber/do"

	"github.com/nidao003/mclaw/backend/biz/data/model"
	"github.com/nidao003/mclaw/backend/biz/data/repo"
	"github.com/nidao003/mclaw/backend/domain"
	"github.com/nidao003/mclaw/backend/pkg/oohdata"
)

// cityUsecase 实现 domain.DataCityUsecase
type cityUsecase struct {
	repo *repo.OohRepo
}

var _ domain.DataCityUsecase = (*cityUsecase)(nil)

// NewCityUsecase 构造城市查询用例。ooh_data 未配置时优雅降级。
func NewCityUsecase(i *do.Injector) (domain.DataCityUsecase, error) {
	oohClient := do.MustInvoke[*oohdata.Client](i)
	return &cityUsecase{repo: repo.NewOohRepo(oohClient.DB())}, nil
}

func (uc *cityUsecase) GetCityDetail(ctx context.Context, cityCode string) (*model.CityVO, error) {
	if !uc.repo.Available() {
		return nil, errDataUnavailable
	}
	return uc.repo.GetCityDetail(ctx, cityCode)
}

func (uc *cityUsecase) GetCityAllRecords(ctx context.Context, cityCode string) ([]model.CityVO, error) {
	if !uc.repo.Available() {
		return nil, errDataUnavailable
	}
	return uc.repo.GetCityAllRecords(ctx, cityCode)
}

func (uc *cityUsecase) GetPassengerFlow(ctx context.Context, cityCode, yearMonth string) (*model.PassengerFlowVO, error) {
	if !uc.repo.Available() {
		return nil, errDataUnavailable
	}
	v := model.NewPassengerFlowVO()
	if yearMonth == "" {
		// 最新一天
		latest, err := uc.repo.GetPassengerFlowLatest(ctx, cityCode)
		if err != nil {
			return nil, err
		}
		if latest != nil {
			return latest, nil
		}
		return v, nil
	}
	// 当月每日
	daily, err := uc.repo.GetPassengerFlowByMonth(ctx, cityCode, yearMonth)
	if err != nil {
		return nil, err
	}
	v.DailyFlows = daily
	return v, nil
}

func (uc *cityUsecase) GetTopFlow(ctx context.Context, cityCode string) (map[string]any, error) {
	if !uc.repo.Available() {
		return nil, errDataUnavailable
	}
	return uc.repo.GetTopFlow(ctx, cityCode)
}

func (uc *cityUsecase) GetYearlyFlow(ctx context.Context, cityCode string) ([]map[string]any, error) {
	if !uc.repo.Available() {
		return nil, errDataUnavailable
	}
	return uc.repo.GetYearlyFlow(ctx, cityCode)
}

func (uc *cityUsecase) GetCityLines(ctx context.Context, cityCode string) ([]model.LineSimpleVO, error) {
	if !uc.repo.Available() {
		return nil, errDataUnavailable
	}
	return uc.repo.GetCityLines(ctx, cityCode)
}

func (uc *cityUsecase) GetCityStations(ctx context.Context, cityCode string, page, pageSize int) (map[string]any, error) {
	if !uc.repo.Available() {
		return nil, errDataUnavailable
	}
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 200 {
		pageSize = 50
	}
	offset := (page - 1) * pageSize
	total, err := uc.repo.GetCityStationCount(ctx, cityCode)
	if err != nil {
		return nil, err
	}
	list, err := uc.repo.GetCityStations(ctx, cityCode, pageSize, offset)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
		"list":     list,
	}, nil
}

func (uc *cityUsecase) GetCityDurations(ctx context.Context, cityCode string) ([]model.CityDurationVO, error) {
	if !uc.repo.Available() {
		return nil, errDataUnavailable
	}
	// 取季度列表（全部或单城市），按 cityCode 聚合成 CityDurationVO
	var durations []model.DurationInfo
	var err error
	if cityCode == "" {
		durations, err = uc.repo.ListAllDurations(ctx)
	} else {
		durations, err = uc.repo.ListDurationsByCity(ctx, cityCode)
	}
	if err != nil {
		return nil, err
	}
	// 按城市分组聚合
	groups := make(map[string]*model.CityDurationVO)
	order := []string{}
	for _, d := range durations {
		key := d.CityCode
		if key == "" {
			key = d.CityName
		}
		v, ok := groups[key]
		if !ok {
			v = model.NewCityDurationVO()
			v.CityCode = d.CityCode
			v.CityName = d.CityName
			groups[key] = v
			order = append(order, key)
		}
		v.Durations = append(v.Durations, d)
		v.DurationCount++
	}
	out := make([]model.CityDurationVO, 0, len(order))
	for _, k := range order {
		out = append(out, *groups[k])
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("未找到城市 %s 的季度数据", cityCode)
	}
	return out, nil
}

// lineUsecase 实现 domain.DataLineUsecase
type lineUsecase struct {
	repo *repo.OohRepo
}

var _ domain.DataLineUsecase = (*lineUsecase)(nil)

// NewLineUsecase 构造线路查询用例。ooh_data 未配置时优雅降级。
func NewLineUsecase(i *do.Injector) (domain.DataLineUsecase, error) {
	oohClient := do.MustInvoke[*oohdata.Client](i)
	return &lineUsecase{repo: repo.NewOohRepo(oohClient.DB())}, nil
}

func (uc *lineUsecase) GetLineDetail(ctx context.Context, lineID int64) (*model.LineVO, error) {
	if !uc.repo.Available() {
		return nil, errDataUnavailable
	}
	return uc.repo.GetLineDetail(ctx, lineID)
}

func (uc *lineUsecase) GetLineStations(ctx context.Context, lineID int64) ([]model.StationSimpleVO, error) {
	if !uc.repo.Available() {
		return nil, errDataUnavailable
	}
	// Java getLineStations 用 original_line_id 过滤；若传入的是 id 而非 original_line_id，
	// 先取线路详情拿 originalLineID 再查车站
	detail, err := uc.repo.GetLineDetail(ctx, lineID)
	if err != nil {
		return nil, err
	}
	if detail == nil {
		return nil, nil
	}
	origID := detail.OriginalLineID
	if origID == 0 {
		origID = lineID
	}
	return uc.repo.GetLineStations(ctx, origID)
}

// businessUsecase 实现 domain.DataBusinessUsecase
type businessUsecase struct {
	repo *repo.OohRepo
}

var _ domain.DataBusinessUsecase = (*businessUsecase)(nil)

// NewBusinessUsecase 构造业态查询用例。ooh_data 未配置时优雅降级。
func NewBusinessUsecase(i *do.Injector) (domain.DataBusinessUsecase, error) {
	oohClient := do.MustInvoke[*oohdata.Client](i)
	return &businessUsecase{repo: repo.NewOohRepo(oohClient.DB())}, nil
}

func (uc *businessUsecase) GetStationBusinessList(ctx context.Context, stationID int64, durationID *int, limit int) ([]model.BusinessVO, error) {
	if !uc.repo.Available() {
		return nil, errDataUnavailable
	}
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	return uc.repo.GetStationBusinessList(ctx, stationID, durationID, limit)
}

func (uc *businessUsecase) GetBusinessDetail(ctx context.Context, stationID int64, durationID *int, industryID *int64, keyword string, limit int) ([]model.BusinessDetailVO, error) {
	if !uc.repo.Available() {
		return nil, errDataUnavailable
	}
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	return uc.repo.GetBusinessDetail(ctx, stationID, durationID, industryID, keyword, limit)
}
