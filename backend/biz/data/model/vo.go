// Package model 存放数据 API 的 VO 结构，字段对齐 Java ruoyi-query-service 的 VO。
package model

import "github.com/shopspring/decimal"

// StationVO 车站完整画像（对齐 Java StationVO）
type StationVO struct {
	// 基础信息
	StationID     int64           `json:"stationId"`
	StationName   string          `json:"stationName"`
	CityName      string          `json:"cityName"`
	CityCode      string          `json:"cityCode"`
	Longitude     decimal.Decimal `json:"longitude"`
	Latitude      decimal.Decimal `json:"latitude"`
	LineName      string          `json:"lineName"`
	IsTransfer    bool            `json:"isTransfer"`
	ImageURL      string          `json:"imageUrl"`
	DataStartDate string          `json:"dataStartDate"`
	DataEndDate   string          `json:"dataEndDate"`
	// 人口（4 类）
	ResidentPopulation *PopulationData `json:"residentPopulation"`
	VisitorCount       *PopulationData `json:"visitorCount"`
	WorkerPopulation   *PopulationData `json:"workerPopulation"`
	ResidentLiving     *PopulationData `json:"residentLiving"`
	// 画像标签
	ResidentLabels map[string][]LabelDistribution `json:"residentLabels"`
	VisitorLabels  map[string][]LabelDistribution `json:"visitorLabels"`
	// 业态 + 产业
	BusinessSummaries []BusinessSummary `json:"businessSummaries"`
	IndustryData      *IndustryData     `json:"industryData"`
}

// PopulationData 人口数据（对齐 Java PopulationData）
type PopulationData struct {
	Number        int64           `json:"number"`
	NumberUnit    string          `json:"numberUnit"`
	Density       decimal.Decimal `json:"density"`
	DensityUnit   string          `json:"densityUnit"`
	DensityLevel  string          `json:"densityLevel"`
	CityRatio     decimal.Decimal `json:"cityRatio"`
	CityRatioUnit string          `json:"cityRatioUnit"`
}

// LabelDistribution 标签分布（对齐 Java LabelDistribution）
type LabelDistribution struct {
	ValueRange string          `json:"valueRange"`
	Ratio      decimal.Decimal `json:"ratio"`
}

// BusinessSummary 业态配套汇总（对齐 Java BusinessSummary）
type BusinessSummary struct {
	BusinessID     int64  `json:"businessId"`
	IndustryName   string `json:"industryName"`
	IndustryType   int    `json:"industryType"`
	Number         int    `json:"number"`
	DensityCompare string `json:"densityCompare"`
}

// IndustryData 产业数据（对齐 Java IndustryData）
type IndustryData struct {
	AvgHousePrice            decimal.Decimal `json:"avgHousePrice"`
	AvgHousePriceUnit        string          `json:"avgHousePriceUnit"`
	AvgPropertyFee           decimal.Decimal `json:"avgPropertyFee"`
	AvgPropertyFeeUnit       string          `json:"avgPropertyFeeUnit"`
	BuildNumber              int             `json:"buildNumber"`
	BuildNumberUnit          string          `json:"buildNumberUnit"`
	HoldNumber               int             `json:"holdNumber"`
	HoldNumberUnit           string          `json:"holdNumberUnit"`
	ParkingNumber            int             `json:"parkingNumber"`
	ParkingNumberUnit        string          `json:"parkingNumberUnit"`
	ShopRentNumber           int             `json:"shopRentNumber"`
	ShopRentNumberUnit       string          `json:"shopRentNumberUnit"`
	ShopRentAvgDay           decimal.Decimal `json:"shopRentAvgDay"`
	ShopRentAvgDayUnit       string          `json:"shopRentAvgDayUnit"`
	ShopRentAvgMonth         decimal.Decimal `json:"shopRentAvgMonth"`
	ShopRentAvgMonthUnit     string          `json:"shopRentAvgMonthUnit"`
	OfficeRentAvgDay         decimal.Decimal `json:"officeRentAvgDay"`
	OfficeRentAvgDayUnit     string          `json:"officeRentAvgDayUnit"`
	OfficeRentAvgMonth       decimal.Decimal `json:"officeRentAvgMonth"`
	OfficeRentAvgMonthUnit   string          `json:"officeRentAvgMonthUnit"`
	OfficeRentBuildNumber    int             `json:"officeRentBuildNumber"`
	OfficeRentBuildNumberUnit string         `json:"officeRentBuildNumberUnit"`
	OfficeRentUnit           int             `json:"officeRentUnit"`
	OfficeRentUnitUnit       string          `json:"officeRentUnitUnit"`
	OfficeRentArea           decimal.Decimal `json:"officeRentArea"`
	OfficeRentAreaUnit       string          `json:"officeRentAreaUnit"`
}

// StationSearchResult 车站搜索结果（对齐 Java StationSearchResultVO）
type StationSearchResult struct {
	StationID   int64  `json:"stationId"`
	StationName string `json:"stationName"`
	CityCode    string `json:"cityCode"`
	CityName    string `json:"cityName"`
	LineName    string `json:"lineName"`
	IsTransfer  bool   `json:"isTransfer"`
	HasData     bool   `json:"hasData"`
}

// NewPopulationData 返回带默认单位的 PopulationData
func NewPopulationData() *PopulationData {
	return &PopulationData{
		NumberUnit:    "人",
		DensityUnit:   "万人/K㎡",
		CityRatioUnit: "%",
	}
}

// NewIndustryData 返回带默认单位的 IndustryData
func NewIndustryData() *IndustryData {
	return &IndustryData{
		AvgHousePriceUnit:         "元/㎡",
		AvgPropertyFeeUnit:        "元/月/㎡",
		BuildNumberUnit:           "栋",
		HoldNumberUnit:            "户",
		ParkingNumberUnit:         "个",
		ShopRentNumberUnit:        "间",
		ShopRentAvgDayUnit:        "元/㎡/天",
		ShopRentAvgMonthUnit:      "元/㎡/月",
		OfficeRentAvgDayUnit:      "元/㎡/天",
		OfficeRentAvgMonthUnit:    "元/㎡/月",
		OfficeRentBuildNumberUnit: "栋",
		OfficeRentUnitUnit:        "间",
		OfficeRentAreaUnit:        "㎡",
	}
}

// ==================== 城市相关 ====================

// CityVO 城市信息（对齐 Java CityVO）
type CityVO struct {
	CityCode                string          `json:"cityCode"`
	CityName                string          `json:"cityName"`
	CityStdCode             string          `json:"cityStdCode"`
	Description             string          `json:"description"`
	LogoURL                 string          `json:"logoUrl"`
	WebsiteURL              string          `json:"websiteUrl"`
	LineCount               *int            `json:"lineCount"`
	LineCountUnit           string          `json:"lineCountUnit"`
	StationCount            *int            `json:"stationCount"`
	StationCountUnit        string          `json:"stationCountUnit"`
	TotalMilage             decimal.Decimal `json:"totalMilage"`
	TotalMilageUnit         string          `json:"totalMilageUnit"`
	LineOpen                *int            `json:"lineOpen"`
	LineBuild               *int            `json:"lineBuild"`
	CurrentPassengerFlow    decimal.Decimal `json:"currentPassengerFlow"`
	CurrentPassengerFlowUnit string         `json:"currentPassengerFlowUnit"`
	TopPassengerFlow        decimal.Decimal `json:"topPassengerFlow"`
	TopPassengerFlowUnit    string          `json:"topPassengerFlowUnit"`
	DataDate                string          `json:"dataDate"`
	TopFlowDate             string          `json:"topFlowDate"`
}

// NewCityVO 返回带默认单位的 CityVO
func NewCityVO() *CityVO {
	return &CityVO{
		LineCountUnit:            "条",
		StationCountUnit:         "座",
		TotalMilageUnit:          "km",
		CurrentPassengerFlowUnit: "万人次",
		TopPassengerFlowUnit:     "万人次",
	}
}

// PassengerFlowVO 城市客流（对齐 Java PassengerFlowVO）
type PassengerFlowVO struct {
	CurrentFlow     decimal.Decimal `json:"currentFlow"`
	CurrentFlowUnit string          `json:"currentFlowUnit"`
	FlowRatio       decimal.Decimal `json:"flowRatio"`
	TopFlow         decimal.Decimal `json:"topFlow"`
	TopFlowUnit     string          `json:"topFlowUnit"`
	DataDate        string          `json:"dataDate"`
	DailyFlows      []map[string]any `json:"dailyFlows"`
}

// NewPassengerFlowVO 返回带默认单位的 PassengerFlowVO
func NewPassengerFlowVO() *PassengerFlowVO {
	return &PassengerFlowVO{
		CurrentFlowUnit: "万人次",
		TopFlowUnit:     "万人次",
	}
}

// CityDurationVO 城市季度可用性（对齐 Java CityDurationVO）
type CityDurationVO struct {
	CityCode                string           `json:"cityCode"`
	CityName                string           `json:"cityName"`
	DurationCount           int              `json:"durationCount"`
	CurrentPassengerFlow    decimal.Decimal  `json:"currentPassengerFlow"`
	CurrentPassengerFlowUnit string          `json:"currentPassengerFlowUnit"`
	TopPassengerFlow        decimal.Decimal  `json:"topPassengerFlow"`
	TopPassengerFlowUnit    string           `json:"topPassengerFlowUnit"`
	DataDate                string           `json:"dataDate"`
	TopFlowDate             string           `json:"topFlowDate"`
	RankingYear             *int             `json:"rankingYear"`
	Ranking                 *int             `json:"ranking"`
	CityLevel               string           `json:"cityLevel"`
	CharmIndex              *float32         `json:"charmIndex"`
	Durations               []DurationInfo   `json:"durations"`
}

// DurationInfo 季度信息
type DurationInfo struct {
	DurationID  int    `json:"durationId"`
	CityCode    string `json:"cityCode"`
	CityName    string `json:"cityName"`
	StartDate   string `json:"startDate"`
	EndDate     string `json:"endDate"`
	Description string `json:"description"`
	Status      int    `json:"status"`
}

// NewCityDurationVO 返回带默认单位的 CityDurationVO
func NewCityDurationVO() *CityDurationVO {
	return &CityDurationVO{
		CurrentPassengerFlowUnit: "万人次",
		TopPassengerFlowUnit:     "万人次",
	}
}

// ==================== 线路相关 ====================

// LineVO 线路详情（对齐 Java LineVO）
type LineVO struct {
	LineID             int64           `json:"lineId"`
	OriginalLineID     int64           `json:"originalLineId"`
	LineName           string          `json:"lineName"`
	CityCode           string          `json:"cityCode"`
	CityName           string          `json:"cityName"`
	ProvinceName       string          `json:"provinceName"`
	LineLength         decimal.Decimal `json:"lineLength"`
	LineLengthUnit     string          `json:"lineLengthUnit"`
	StationCount       *int            `json:"stationCount"`
	LineColor          string          `json:"lineColor"`
	OperationStartTime string          `json:"operationStartTime"`
	OperationCompany   string          `json:"operationCompany"`
	Description        string          `json:"description"`
	LogoURL            string          `json:"logoUrl"`
	StationNum         *int            `json:"stationNum"`
	OpenTime           string          `json:"openTime"`
	UpDirection        string          `json:"upDirection"`
	DownDirection      string          `json:"downDirection"`
	Devicemodels       string          `json:"devicemodels"`
	OverviewCompressed string          `json:"overviewCompressed"`
}

// NewLineVO 返回带默认单位的 LineVO
func NewLineVO() *LineVO {
	return &LineVO{LineLengthUnit: "km"}
}

// LineSimpleVO 线路简要（对齐 Java LineSimpleVO）
type LineSimpleVO struct {
	LineID             int64           `json:"lineId"`
	OriginalLineID     int64           `json:"originalLineId"`
	LineName           string          `json:"lineName"`
	CityCode           string          `json:"cityCode"`
	CityName           string          `json:"cityName"`
	ProvinceName       string          `json:"provinceName"`
	LineLength         decimal.Decimal `json:"lineLength"`
	LineLengthUnit     string          `json:"lineLengthUnit"`
	LineColor          string          `json:"lineColor"`
	StationNum         *int            `json:"stationNum"`
	OpenTime           string          `json:"openTime"`
	UpDirection        string          `json:"upDirection"`
	DownDirection      string          `json:"downDirection"`
	Devicemodels       string          `json:"devicemodels"`
	LineIntroduction   string          `json:"lineIntroduction"`
	OverviewCompressed string          `json:"overviewCompressed"`
}

// NewLineSimpleVO 返回带默认单位的 LineSimpleVO
func NewLineSimpleVO() *LineSimpleVO {
	return &LineSimpleVO{LineLengthUnit: "km"}
}

// StationSimpleVO 车站简要（对齐 Java StationSimpleVO）
type StationSimpleVO struct {
	StationID    int64           `json:"stationId"`
	StationName  string          `json:"stationName"`
	CityCode     string          `json:"cityCode"`
	CityName     string          `json:"cityName"`
	Longitude    decimal.Decimal `json:"longitude"`
	Latitude     decimal.Decimal `json:"latitude"`
	IsTransfer   bool            `json:"isTransfer"`
	LineID       int64           `json:"lineId"`
	LineIDs      []int64         `json:"lineIds"`
	LineName     string          `json:"lineName"`
	LineNames    []string        `json:"lineNames"`
	Population   int64           `json:"population"`
	LineNamesStr string          `json:"lineNamesStr"`
	LineIDsStr   string          `json:"lineIdsStr"`
}

// ==================== 业态明细 ====================

// BusinessVO 业态配套（对齐 Java BusinessVO，区别于 BusinessSummary）
type BusinessVO struct {
	BusinessID     int64  `json:"businessId"`
	IndustryName   string `json:"industryName"`
	IndustryType   int    `json:"industryType"`
	StationID      int64  `json:"stationId"`
	Number         int    `json:"number"`
	DensityCompare string `json:"densityCompare"`
}

// BusinessDetailVO 业态详情（对齐 Java BusinessDetailVO）
type BusinessDetailVO struct {
	DetailID      int64           `json:"detailId"`
	IndustryName  string          `json:"industryName"`
	IndustryType  int             `json:"industryType"`
	BusinessName  string          `json:"businessName"`
	Distance      decimal.Decimal `json:"distance"`
	HouseNumber   int             `json:"houseNumber"`
	Price         decimal.Decimal `json:"price"`
	Area          decimal.Decimal `json:"area"`
	RentDay       decimal.Decimal `json:"rentDay"`
	RentMonth     decimal.Decimal `json:"rentMonth"`
	Floor         int             `json:"floor"`
	RentArea      decimal.Decimal `json:"rentArea"`
}

