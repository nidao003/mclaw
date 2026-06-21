// Package repo 封装 ooh_data 远程只读 MySQL 查询，SQL 照搬 Java ruoyi-query-service StationMapper.xml。
package repo

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/shopspring/decimal"

	"github.com/nidao003/mclaw/backend/biz/data/model"
)

// OohRepo ooh_data 只读查询仓库。
type OohRepo struct {
	db *sqlx.DB
}

// NewOohRepo 构造仓库。db 为 nil 时数据 API 不可用，调用方应拦截。
func NewOohRepo(db *sqlx.DB) *OohRepo {
	return &OohRepo{db: db}
}

// Available 数据源是否可用。
func (r *OohRepo) Available() bool {
	return r != nil && r.db != nil
}

// GetStationBase 车站基础信息（对应 Java getStationBase）。
// durationId 为 nil 时取该城市 status=1 的最新版本。
func (r *OohRepo) GetStationBase(ctx context.Context, stationID int64, durationID *int) (*model.StationVO, error) {
	// durationId 为空时，先查该车站所在城市最新 status=1 的 duration
	durID := 0
	if durationID != nil {
		durID = *durationID
	} else {
		const dq = `
			SELECT d2.id FROM sw_duration d2
			WHERE d2.status = 1 AND d2.citycode = (
				SELECT l2.citycode FROM sw_rim_station s2
				INNER JOIN sw_rim_line l2 ON s2.line_id = l2.id
				WHERE s2.original_station_id = ? AND s2.enabled = 1 LIMIT 1
			)
			ORDER BY d2.start_date DESC, d2.id DESC LIMIT 1
		`
		var did int
		if err := r.db.GetContext(ctx, &did, dq, stationID); err != nil {
			if err != sql.ErrNoRows {
				return nil, fmt.Errorf("query latest duration: %w", err)
			}
		} else {
			durID = did
		}
	}

	const q = `
		SELECT
			s.original_station_id AS stationId,
			s.name AS stationName,
			l.cityname AS cityName,
			l.citycode AS cityCode,
			s.longitude AS longitude,
			s.latitude AS latitude,
			si.overview_compressed AS imageUrl,
			GROUP_CONCAT(DISTINCT l.name ORDER BY l.name SEPARATOR ',') AS lineName,
			CASE WHEN COUNT(DISTINCT SUBSTRING_INDEX(l.name, '(', 1)) > 1 THEN 1 ELSE 0 END AS isTransfer,
			duration.start_date AS dataStartDate,
			duration.end_date AS dataEndDate
		FROM sw_rim_station s
		INNER JOIN sw_rim_line l ON s.line_id = l.id
		LEFT JOIN sw_rim_station_image si ON s.original_station_id = si.original_station_id
		LEFT JOIN sw_duration duration ON duration.id = ?
		WHERE s.original_station_id = ?
		  AND s.enabled = 1
		GROUP BY s.original_station_id, s.name, l.cityname, l.citycode, s.longitude, s.latitude, si.overview_compressed, duration.start_date, duration.end_date
		LIMIT 1
	`

	var (
		v                 model.StationVO
		imageURL, lineName sql.NullString
		lon, lat           sql.NullFloat64
		dataStart, dataEnd sql.NullString
	)
	if err := r.db.QueryRowxContext(ctx, q, durID, stationID).Scan(
		&v.StationID, &v.StationName, &v.CityName, &v.CityCode, &lon, &lat,
		&imageURL, &lineName, &v.IsTransfer, &dataStart, &dataEnd,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get station base: %w", err)
	}
	v.ImageURL = imageURL.String
	v.LineName = lineName.String
	v.DataStartDate = dataStart.String
	v.DataEndDate = dataEnd.String
	if lon.Valid {
		v.Longitude = decimal.NewFromFloat(lon.Float64)
	}
	if lat.Valid {
		v.Latitude = decimal.NewFromFloat(lat.Float64)
	}
	return &v, nil
}

// GetPopulation 人口数据（对应 Java getPopulationData）。personType: 1常驻 2到访 3工作 4居住
func (r *OohRepo) GetPopulation(ctx context.Context, stationID int64, personType int, durationID *int) (*model.PopulationData, error) {
	var q string
	var args []any
	if durationID == nil {
		q = `
			SELECT p.number, p.density_value, p.density_compare, p.rate
			FROM sw_station_population p
			INNER JOIN sw_duration d ON p.duration_id = d.id AND d.status = 1
			WHERE p.station_id = ? AND p.person_type = ?
			ORDER BY d.start_date DESC, d.id DESC, p.duration_id DESC LIMIT 1 `
		args = []any{stationID, personType}
	} else {
		q = `
			SELECT p.number, p.density_value, p.density_compare, p.rate
			FROM sw_station_population p
			WHERE p.station_id = ? AND p.person_type = ? AND p.duration_id = ?
			ORDER BY p.duration_id DESC LIMIT 1 `
		args = []any{stationID, personType, *durationID}
	}

	pd := model.NewPopulationData()
	var (
		number          sql.NullInt64
		density, ratio  sql.NullFloat64
		level           sql.NullString
	)
	if err := r.db.QueryRowxContext(ctx, q, args...).Scan(&number, &density, &level, &ratio); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get population: %w", err)
	}
	pd.Number = number.Int64
	pd.DensityLevel = level.String
	if density.Valid {
		pd.Density = decimal.NewFromFloat(density.Float64)
	}
	if ratio.Valid {
		pd.CityRatio = decimal.NewFromFloat(ratio.Float64)
	}
	return pd, nil
}

// GetIndustry 产业数据（对应 Java getIndustryData）
func (r *OohRepo) GetIndustry(ctx context.Context, stationID int64, durationID *int) (*model.IndustryData, error) {
	var q string
	var args []any
	if durationID == nil {
		q = `
			SELECT i.house_avg_price, i.house_avg_property, i.house_build_number, i.house_hold_number,
			       i.house_parking_number, i.shop_rent_number, i.shop_rent_avg_day, i.shop_rent_avg_month,
			       i.office_rent_avg_day, i.office_rent_avg_month, i.office_rent_build_number,
			       i.office_rent_unit, i.office_rent_area
			FROM sw_station_industry_data i
			INNER JOIN sw_duration d ON i.duration_id = d.id AND d.status = 1
			WHERE i.station_id = ?
			ORDER BY d.start_date DESC, d.id DESC, i.duration_id DESC, i.id DESC LIMIT 1 `
		args = []any{stationID}
	} else {
		q = `
			SELECT i.house_avg_price, i.house_avg_property, i.house_build_number, i.house_hold_number,
			       i.house_parking_number, i.shop_rent_number, i.shop_rent_avg_day, i.shop_rent_avg_month,
			       i.office_rent_avg_day, i.office_rent_avg_month, i.office_rent_build_number,
			       i.office_rent_unit, i.office_rent_area
			FROM sw_station_industry_data i
			WHERE i.station_id = ? AND i.duration_id = ?
			ORDER BY i.duration_id DESC, i.id DESC LIMIT 1 `
		args = []any{stationID, *durationID}
	}

	ind := model.NewIndustryData()
	var (
		hp, prop, sDay, sMonth, oDay, oMonth, oArea sql.NullFloat64
		build, hold, parking, shopN, oBuild, oUnit  sql.NullInt64
	)
	if err := r.db.QueryRowxContext(ctx, q, args...).Scan(
		&hp, &prop, &build, &hold, &parking, &shopN, &sDay, &sMonth, &oDay, &oMonth, &oBuild, &oUnit, &oArea,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get industry: %w", err)
	}
	ind.BuildNumber = int(build.Int64)
	ind.HoldNumber = int(hold.Int64)
	ind.ParkingNumber = int(parking.Int64)
	ind.ShopRentNumber = int(shopN.Int64)
	ind.OfficeRentBuildNumber = int(oBuild.Int64)
	ind.OfficeRentUnit = int(oUnit.Int64)
	if hp.Valid {
		ind.AvgHousePrice = decimal.NewFromFloat(hp.Float64)
	}
	if prop.Valid {
		ind.AvgPropertyFee = decimal.NewFromFloat(prop.Float64)
	}
	if sDay.Valid {
		ind.ShopRentAvgDay = decimal.NewFromFloat(sDay.Float64)
	}
	if sMonth.Valid {
		ind.ShopRentAvgMonth = decimal.NewFromFloat(sMonth.Float64)
	}
	if oDay.Valid {
		ind.OfficeRentAvgDay = decimal.NewFromFloat(oDay.Float64)
	}
	if oMonth.Valid {
		ind.OfficeRentAvgMonth = decimal.NewFromFloat(oMonth.Float64)
	}
	if oArea.Valid {
		ind.OfficeRentArea = decimal.NewFromFloat(oArea.Float64)
	}
	return ind, nil
}

// GetBusinessSummaries 业态配套汇总（对应 Java getBusinessSummaries）
func (r *OohRepo) GetBusinessSummaries(ctx context.Context, stationID int64, durationID *int) ([]model.BusinessSummary, error) {
	var q string
	var args []any
	if durationID == nil {
		q = `
			SELECT b.id, ii.industry_name, ii.industry_type, b.number, b.density_compare
			FROM sw_station_business b
			INNER JOIN sw_industry_info ii ON b.industry_id = ii.industry_id
			WHERE b.station_id = ? AND b.deleted = 0
			  AND b.duration_id = (
			      SELECT b2.duration_id FROM sw_station_business b2
			      INNER JOIN sw_duration d2 ON b2.duration_id = d2.id AND d2.status = 1
			      WHERE b2.station_id = ? AND b2.deleted = 0
			      ORDER BY d2.start_date DESC, d2.id DESC, b2.duration_id DESC LIMIT 1
			  )
			ORDER BY b.number DESC `
		args = []any{stationID, stationID}
	} else {
		q = `
			SELECT b.id, ii.industry_name, ii.industry_type, b.number, b.density_compare
			FROM sw_station_business b
			INNER JOIN sw_industry_info ii ON b.industry_id = ii.industry_id
			WHERE b.station_id = ? AND b.deleted = 0 AND b.duration_id = ?
			ORDER BY b.number DESC `
		args = []any{stationID, *durationID}
	}

	var rows []struct {
		ID             sql.NullInt64  `db:"id"`
		IndustryName   sql.NullString `db:"industry_name"`
		IndustryType   sql.NullInt64  `db:"industry_type"`
		Number         sql.NullInt64  `db:"number"`
		DensityCompare sql.NullString `db:"density_compare"`
	}
	if err := r.db.SelectContext(ctx, &rows, q, args...); err != nil {
		return nil, fmt.Errorf("get business summaries: %w", err)
	}
	out := make([]model.BusinessSummary, 0, len(rows))
	for _, row := range rows {
		out = append(out, model.BusinessSummary{
			BusinessID:     row.ID.Int64,
			IndustryName:   row.IndustryName.String,
			IndustryType:   int(row.IndustryType.Int64),
			Number:         int(row.Number.Int64),
			DensityCompare: row.DensityCompare.String,
		})
	}
	return out, nil
}

// GetLabelDistribution 查单个标签表分布（固定 SQL，替代 Java DSL DISTRIBUTION）。
// tableName 来自内部静态配置（labelTables），非用户输入，可安全拼接。
func (r *OohRepo) GetLabelDistribution(ctx context.Context, tableName string, stationID int64, personType int, durationID *int) ([]model.LabelDistribution, error) {
	var q string
	var args []any
	if durationID == nil {
		// 取该标签表该车站最新 status=1 版本的 duration_id
		q = fmt.Sprintf(`
			SELECT t.value_range, t.data_value
			FROM %s t
			WHERE t.station_id = ? AND t.person_type = ? AND t.deleted = 0
			  AND t.duration_id = (
			      SELECT t2.duration_id FROM %s t2
			      INNER JOIN sw_duration d2 ON t2.duration_id = d2.id AND d2.status = 1
			      WHERE t2.station_id = ? AND t2.person_type = ? AND t2.deleted = 0
			      ORDER BY d2.start_date DESC, d2.id DESC, t2.duration_id DESC LIMIT 1
			  )
			ORDER BY t.id `, tableName, tableName)
		args = []any{stationID, personType, stationID, personType}
	} else {
		q = fmt.Sprintf(`
			SELECT t.value_range, t.data_value
			FROM %s t
			WHERE t.station_id = ? AND t.person_type = ? AND t.deleted = 0 AND t.duration_id = ?
			ORDER BY t.id `, tableName)
		args = []any{stationID, personType, *durationID}
	}

	var rows []struct {
		ValueRange sql.NullString  `db:"value_range"`
		DataValue  sql.NullFloat64 `db:"data_value"`
	}
	if err := r.db.SelectContext(ctx, &rows, q, args...); err != nil {
		return nil, fmt.Errorf("get label distribution %s: %w", tableName, err)
	}
	out := make([]model.LabelDistribution, 0, len(rows))
	for _, row := range rows {
		ld := model.LabelDistribution{ValueRange: row.ValueRange.String}
		if row.DataValue.Valid {
			ld.Ratio = decimal.NewFromFloat(row.DataValue.Float64)
		}
		out = append(out, ld)
	}
	return out, nil
}

// SearchStations 车站搜索（对应 Java searchStations）
func (r *OohRepo) SearchStations(ctx context.Context, stationName, cityName, cityCode string, limit int) ([]model.StationSearchResult, error) {
	q := `
		SELECT
			s.original_station_id AS stationId,
			s.name AS stationName,
			l.citycode AS cityCode,
			l.cityname AS cityName,
			GROUP_CONCAT(DISTINCT l.name ORDER BY l.name SEPARATOR ',') AS lineName,
			CASE WHEN COUNT(DISTINCT SUBSTRING_INDEX(l.name, '(', 1)) > 1 THEN 1 ELSE 0 END AS isTransfer,
			CASE WHEN MAX(population.number) IS NOT NULL THEN 1 ELSE 0 END AS hasData
		FROM sw_rim_station s
		INNER JOIN sw_rim_line l ON s.line_id = l.id
		INNER JOIN (
			SELECT station_id, number
			FROM (
				SELECT p.station_id, p.number,
					ROW_NUMBER() OVER (PARTITION BY p.station_id ORDER BY p.id DESC) as rn
				FROM sw_station_population p
				INNER JOIN sw_duration d ON p.duration_id = d.id AND d.status = 1
				WHERE p.person_type = 1
			) t
			WHERE rn = 1
		) population ON s.original_station_id = population.station_id
		WHERE s.enabled = 1
		  AND (
		      s.name LIKE CONCAT('%', ?, '%')
		      OR REPLACE(s.name, '站', '') LIKE CONCAT('%', ?, '%')
		      OR REPLACE(s.name, '站', '') = REPLACE(?, '站', '')
		  )
	`
	args := []any{stationName, stationName, stationName}
	if cityCode != "" {
		q += ` AND l.citycode = ? `
		args = append(args, cityCode)
	}
	if cityName != "" {
		q += ` AND l.cityname = ? `
		args = append(args, cityName)
	}
	q += `
		GROUP BY s.original_station_id, s.name, l.citycode, l.cityname
		ORDER BY
			CASE WHEN s.name = ? THEN 0 ELSE 1 END,
			MAX(population.number) DESC,
			s.original_station_id
		LIMIT ?
	`
	args = append(args, stationName, limit)

	var rows []struct {
		StationID   sql.NullInt64  `db:"stationId"`
		StationName sql.NullString `db:"stationName"`
		CityCode    sql.NullString `db:"cityCode"`
		CityName    sql.NullString `db:"cityName"`
		LineName    sql.NullString `db:"lineName"`
		IsTransfer  sql.NullInt64  `db:"isTransfer"`
		HasData     sql.NullInt64  `db:"hasData"`
	}
	if err := r.db.SelectContext(ctx, &rows, q, args...); err != nil {
		return nil, fmt.Errorf("search stations: %w", err)
	}
	out := make([]model.StationSearchResult, 0, len(rows))
	for _, row := range rows {
		out = append(out, model.StationSearchResult{
			StationID:   row.StationID.Int64,
			StationName: row.StationName.String,
			CityCode:    row.CityCode.String,
			CityName:    row.CityName.String,
			LineName:    row.LineName.String,
			IsTransfer:  row.IsTransfer.Int64 == 1,
			HasData:     row.HasData.Int64 == 1,
		})
	}
	return out, nil
}
