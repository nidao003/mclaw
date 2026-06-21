package repo

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"strings"

	"github.com/shopspring/decimal"

	"github.com/nidao003/mclaw/backend/biz/data/model"
)

// resolveCityName 把 cityCode（数字编码如 110100 或拼音如 beijing）解析成中文城市名。
// 对应 Java getCityNameByCode：优先 sw_rim_line.cityname，其次 sw_metro_cities.city_name
func (r *OohRepo) resolveCityName(ctx context.Context, cityCode string) (string, error) {
	const q = `SELECT COALESCE(
		(SELECT cityname FROM sw_rim_line WHERE citycode = ? LIMIT 1),
		(SELECT city_name FROM sw_metro_cities WHERE city_code = ? LIMIT 1)
	)`
	var name sql.NullString
	if err := r.db.GetContext(ctx, &name, q, cityCode, cityCode); err != nil {
		return "", fmt.Errorf("resolve city name: %w", err)
	}
	return name.String, nil
}

// GetCityDetail 城市基本信息（对应 Java getCityDetail）
func (r *OohRepo) GetCityDetail(ctx context.Context, cityCode string) (*model.CityVO, error) {
	const q = `
		SELECT
			COALESCE(c.city_code, l.citycode) AS cityCode,
			COALESCE(c.city_name, l.cityname) AS cityName,
			c.city_std_code AS cityStdCode,
			ci.city_metro_introduction AS description,
			ci.overview_compressed AS logoUrl,
			c.url AS websiteUrl,
			c.line_open AS lineOpen,
			c.line_build AS lineBuild,
			c.total_milage AS totalMilage,
			c.flow_last AS currentPassengerFlow,
			c.flow_top AS topPassengerFlow,
			c.data_date AS dataDate,
			(SELECT MIN(data_date) FROM sw_metro_cities
			 WHERE city_name = COALESCE(c.city_name, l.cityname) AND flow_top = c.flow_top) AS topFlowDate
		FROM (SELECT ? AS lookup_code) AS param
		LEFT JOIN sw_metro_cities c ON c.city_code = param.lookup_code
			OR c.city_name = (SELECT cityname FROM sw_rim_line WHERE citycode = param.lookup_code LIMIT 1)
		LEFT JOIN sw_rim_line l ON l.citycode = param.lookup_code
		LEFT JOIN sw_rim_city_image ci ON COALESCE(c.city_name, l.cityname) = ci.cityname COLLATE utf8mb4_unicode_ci
		WHERE COALESCE(c.city_name, l.cityname) IS NOT NULL
		  AND (c.data_date IS NULL OR c.data_date = (
		      SELECT MAX(data_date) FROM sw_metro_cities
		      WHERE city_name = COALESCE(c.city_name, l.cityname)
		  ))
		LIMIT 1
	`
	v := model.NewCityVO()
	var (
		cityStdCode, desc, logo, webURL, dataDate, topFlowDate sql.NullString
		lineOpen, lineBuild                                    sql.NullInt64
		totalMilage, curFlow, topFlow                          sql.NullFloat64
	)
	if err := r.db.QueryRowxContext(ctx, q, cityCode).Scan(
		&v.CityCode, &v.CityName, &cityStdCode, &desc, &logo, &webURL,
		&lineOpen, &lineBuild, &totalMilage, &curFlow, &topFlow, &dataDate, &topFlowDate,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get city detail: %w", err)
	}
	v.CityStdCode = cityStdCode.String
	v.Description = desc.String
	v.LogoURL = logo.String
	v.WebsiteURL = webURL.String
	v.DataDate = dataDate.String
	v.TopFlowDate = topFlowDate.String
	if lineOpen.Valid {
		lo := int(lineOpen.Int64)
		v.LineOpen = &lo
	}
	if lineBuild.Valid {
		lb := int(lineBuild.Int64)
		v.LineBuild = &lb
	}
	if totalMilage.Valid {
		v.TotalMilage = decimal.NewFromFloat(totalMilage.Float64)
	}
	if curFlow.Valid {
		v.CurrentPassengerFlow = decimal.NewFromFloat(curFlow.Float64)
	}
	if topFlow.Valid {
		v.TopPassengerFlow = decimal.NewFromFloat(topFlow.Float64)
	}
	return v, nil
}

// GetCityAllRecords 城市全部历史（对应 Java getCityAllRecords）
func (r *OohRepo) GetCityAllRecords(ctx context.Context, cityCode string) ([]model.CityVO, error) {
	const q = `
		SELECT c.city_code, c.city_name, c.city_std_code, c.url,
		       c.line_open, c.line_build, c.total_milage, c.flow_last, c.flow_top, c.data_date,
		       (SELECT MIN(data_date) FROM sw_metro_cities
		        WHERE city_name = c.city_name AND flow_top = c.flow_top) AS topFlowDate
		FROM sw_metro_cities c
		WHERE c.city_name = (
		    SELECT COALESCE(
		      (SELECT cityname FROM sw_rim_line WHERE citycode = ? LIMIT 1),
		      (SELECT city_name FROM sw_metro_cities WHERE city_code = ? LIMIT 1)
		    )
		)
		ORDER BY c.data_date DESC
		LIMIT 500
	`
	var rows []struct {
		CityCode    sql.NullString  `db:"city_code"`
		CityName    sql.NullString  `db:"city_name"`
		CityStdCode sql.NullString  `db:"city_std_code"`
		URL         sql.NullString  `db:"url"`
		DataDate    sql.NullString  `db:"data_date"`
		TopFlowDate sql.NullString  `db:"topFlowDate"`
		LineOpen    sql.NullInt64   `db:"line_open"`
		LineBuild   sql.NullInt64   `db:"line_build"`
		TotalMilage sql.NullFloat64 `db:"total_milage"`
		FlowLast    sql.NullFloat64 `db:"flow_last"`
		FlowTop     sql.NullFloat64 `db:"flow_top"`
	}
	if err := r.db.SelectContext(ctx, &rows, q, cityCode, cityCode); err != nil {
		return nil, fmt.Errorf("get city all records: %w", err)
	}
	out := make([]model.CityVO, 0, len(rows))
	for _, row := range rows {
		v := model.NewCityVO()
		v.CityCode = row.CityCode.String
		v.CityName = row.CityName.String
		v.CityStdCode = row.CityStdCode.String
		v.WebsiteURL = row.URL.String
		v.DataDate = row.DataDate.String
		v.TopFlowDate = row.TopFlowDate.String
		if row.LineOpen.Valid {
			lo := int(row.LineOpen.Int64)
			v.LineOpen = &lo
		}
		if row.LineBuild.Valid {
			lb := int(row.LineBuild.Int64)
			v.LineBuild = &lb
		}
		if row.TotalMilage.Valid {
			v.TotalMilage = decimal.NewFromFloat(row.TotalMilage.Float64)
		}
		if row.FlowLast.Valid {
			v.CurrentPassengerFlow = decimal.NewFromFloat(row.FlowLast.Float64)
		}
		if row.FlowTop.Valid {
			v.TopPassengerFlow = decimal.NewFromFloat(row.FlowTop.Float64)
		}
		out = append(out, *v)
	}
	return out, nil
}

// GetPassengerFlowLatest 城市最新一天客流（对应 Java getPassengerFlow，yearMonth 为空）
func (r *OohRepo) GetPassengerFlowLatest(ctx context.Context, cityCode string) (*model.PassengerFlowVO, error) {
	const q = `
		SELECT c.flow_last, c.flow_ratio, c.flow_top, c.data_date
		FROM sw_metro_cities c
		WHERE c.city_name = (
		    SELECT COALESCE(
		      (SELECT cityname FROM sw_rim_line WHERE citycode = ? LIMIT 1),
		      (SELECT city_name FROM sw_metro_cities WHERE city_code = ? LIMIT 1),
		      (SELECT city_name FROM sw_metro_cities WHERE city_std_code = ? LIMIT 1)
		    )
		)
		  AND c.data_date = (
		      SELECT MAX(data_date) FROM sw_metro_cities
		      WHERE city_name = (
		          SELECT COALESCE(
		            (SELECT city_name FROM sw_metro_cities WHERE city_code = ? LIMIT 1),
		            (SELECT cityname FROM sw_rim_line WHERE citycode = ? LIMIT 1),
		            (SELECT city_name FROM sw_metro_cities WHERE city_std_code = ? LIMIT 1)
		          )
		      )
		  )
		LIMIT 1
	`
	v := model.NewPassengerFlowVO()
	var flowLast, flowRatio, flowTop sql.NullFloat64
	var dataDate sql.NullString
	if err := r.db.QueryRowxContext(ctx, q,
		cityCode, cityCode, cityCode, cityCode, cityCode, cityCode,
	).Scan(&flowLast, &flowRatio, &flowTop, &dataDate); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get passenger flow latest: %w", err)
	}
	v.DataDate = dataDate.String
	if flowLast.Valid {
		v.CurrentFlow = decimal.NewFromFloat(flowLast.Float64)
	}
	if flowRatio.Valid {
		v.FlowRatio = decimal.NewFromFloat(flowRatio.Float64)
	}
	if flowTop.Valid {
		v.TopFlow = decimal.NewFromFloat(flowTop.Float64)
	}
	return v, nil
}

// GetPassengerFlowByMonth 城市按月每日客流（对应 Java getPassengerFlowByMonth）
func (r *OohRepo) GetPassengerFlowByMonth(ctx context.Context, cityCode, yearMonth string) ([]map[string]any, error) {
	const q = `
		SELECT c.data_date AS dataDate, c.flow_last AS currentFlow, c.flow_ratio AS flowRatio
		FROM sw_metro_cities c
		WHERE c.city_name = (
		    SELECT COALESCE(
		      (SELECT cityname FROM sw_rim_line WHERE citycode = ? LIMIT 1),
		      (SELECT city_name FROM sw_metro_cities WHERE city_code = ? LIMIT 1),
		      (SELECT city_name FROM sw_metro_cities WHERE city_std_code = ? LIMIT 1)
		    )
		)
		  AND DATE_FORMAT(c.data_date, '%Y-%m') = ?
		ORDER BY c.data_date
	`
	var rows []struct {
		DataDate    sql.NullString  `db:"dataDate"`
		CurrentFlow sql.NullFloat64 `db:"currentFlow"`
		FlowRatio   sql.NullFloat64 `db:"flowRatio"`
	}
	if err := r.db.SelectContext(ctx, &rows, q, cityCode, cityCode, cityCode, yearMonth); err != nil {
		return nil, fmt.Errorf("get passenger flow by month: %w", err)
	}
	out := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		m := map[string]any{
			"dataDate":    row.DataDate.String,
			"currentFlow": nil,
			"flowRatio":   nil,
		}
		if row.CurrentFlow.Valid {
			m["currentFlow"] = decimal.NewFromFloat(row.CurrentFlow.Float64)
		}
		if row.FlowRatio.Valid {
			m["flowRatio"] = decimal.NewFromFloat(row.FlowRatio.Float64)
		}
		out = append(out, m)
	}
	return out, nil
}

// GetTopFlow 城市历史最高客流（对应 Java getTopFlowHistory）
func (r *OohRepo) GetTopFlow(ctx context.Context, cityCode string) (map[string]any, error) {
	const q = `
		SELECT c.data_date AS dataDate, c.flow_top AS topFlow, c.city_name AS cityName
		FROM sw_metro_cities c
		WHERE c.city_name = (
		    SELECT COALESCE(
		      (SELECT cityname FROM sw_rim_line WHERE citycode = ? LIMIT 1),
		      (SELECT city_name FROM sw_metro_cities WHERE city_code = ? LIMIT 1)
		    )
		)
		  AND c.flow_top IS NOT NULL AND c.flow_top > 0
		ORDER BY c.flow_top DESC, c.data_date ASC
		LIMIT 1
	`
	var dataDate, cityName sql.NullString
	var topFlow sql.NullFloat64
	if err := r.db.QueryRowxContext(ctx, q, cityCode, cityCode).Scan(&dataDate, &topFlow, &cityName); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get top flow: %w", err)
	}
	m := map[string]any{
		"dataDate": dataDate.String,
		"cityName": cityName.String,
		"topFlow":  nil,
	}
	if topFlow.Valid {
		m["topFlow"] = decimal.NewFromFloat(topFlow.Float64)
	}
	return m, nil
}

// GetYearlyFlow 城市历年日均客流（对应 Java getYearlyFlowData）
func (r *OohRepo) GetYearlyFlow(ctx context.Context, cityCode string) ([]map[string]any, error) {
	const q = `
		SELECT y.year AS year, y.flow_data AS flowData
		FROM sw_metro_yearly_data y
		WHERE y.city_name = (
		    SELECT COALESCE(
		      (SELECT cityname FROM sw_rim_line WHERE citycode = ? LIMIT 1),
		      (SELECT city_name FROM sw_metro_cities WHERE city_code = ? LIMIT 1)
		    )
		)
		GROUP BY y.year, y.flow_data
		ORDER BY y.year
	`
	var rows []struct {
		Year     sql.NullInt64  `db:"year"`
		FlowData sql.NullString `db:"flowData"`
	}
	if err := r.db.SelectContext(ctx, &rows, q, cityCode, cityCode); err != nil {
		return nil, fmt.Errorf("get yearly flow: %w", err)
	}
	out := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		out = append(out, map[string]any{
			"year":     row.Year.Int64,
			"flowData": row.FlowData.String,
		})
	}
	return out, nil
}

// cityCodeOrMetro 把 cityCode 扩展成 IN 查询（兼容拼音/数字），返回 (placeholders, args)。
// 对应 Java getCityLines/getCityStations 的 citycode IN (...) 子句。
func (r *OohRepo) cityCodeOrMetroArgs(ctx context.Context, cityCode string) (string, []any) {
	// 子查询取 sw_metro_cities 的 6 位数字 city_code
	subq := `(SELECT city_code FROM sw_metro_cities
	          WHERE city_name = (
	              SELECT COALESCE(
	                (SELECT city_name FROM sw_metro_cities WHERE city_code = ? LIMIT 1),
	                (SELECT cityname FROM sw_rim_line WHERE citycode = ? LIMIT 1)
	              )
	          ) AND LENGTH(city_code) = 6 LIMIT 1)`
	return fmt.Sprintf("(?, %s)", subq), []any{cityCode, cityCode, cityCode}
}

// GetCityLines 城市线路列表（对应 Java getCityLines）
func (r *OohRepo) GetCityLines(ctx context.Context, cityCode string) ([]model.LineSimpleVO, error) {
	inClause, inArgs := r.cityCodeOrMetroArgs(ctx, cityCode)
	q := fmt.Sprintf(`
		SELECT
			l.id AS lineId, l.original_line_id AS originalLineId, l.name AS lineName,
			l.citycode AS cityCode, l.cityname AS cityName, l.provincename AS provinceName,
			COALESCE(li.length, l.length) AS lineLength,
			COALESCE(li.colorname, l.color) AS lineColor,
			li.stationnum AS stationNum, li.open_time AS openTime,
			COALESCE(li.upDirection, l.upDirection) AS upDirection,
			COALESCE(li.downDirection, l.downDirection) AS downDirection,
			COALESCE(li.devicemodels, l.devicemodels) AS devicemodels,
			li.line_introduction AS lineIntroduction, li.overview_compressed AS overviewCompressed
		FROM sw_rim_line l
		LEFT JOIN sw_rim_line_image li ON FIND_IN_SET(l.original_line_id, li.original_line_id)
		WHERE l.citycode IN %s AND l.enabled = 1
		ORDER BY l.original_line_id
	`, inClause)
	args := inArgs

	var rows []struct {
		LineID                 sql.NullInt64   `db:"lineId"`
		OriginalLineID         sql.NullInt64   `db:"originalLineId"`
		LineName               sql.NullString  `db:"lineName"`
		CityCode               sql.NullString  `db:"cityCode"`
		CityName               sql.NullString  `db:"cityName"`
		ProvinceName           sql.NullString  `db:"provinceName"`
		LineLength             sql.NullFloat64 `db:"lineLength"`
		LineColor              sql.NullString  `db:"lineColor"`
		OpenTime               sql.NullString  `db:"openTime"`
		UpDir                  sql.NullString  `db:"upDirection"`
		DownDir                sql.NullString  `db:"downDirection"`
		Dev                    sql.NullString  `db:"devicemodels"`
		Intro                  sql.NullString  `db:"lineIntroduction"`
		Overview               sql.NullString  `db:"overviewCompressed"`
		StationNum             sql.NullInt64   `db:"stationNum"`
	}
	if err := r.db.SelectContext(ctx, &rows, q, args...); err != nil {
		return nil, fmt.Errorf("get city lines: %w", err)
	}
	out := make([]model.LineSimpleVO, 0, len(rows))
	for _, row := range rows {
		v := model.NewLineSimpleVO()
		v.LineID = row.LineID.Int64
		v.OriginalLineID = row.OriginalLineID.Int64
		v.LineName = row.LineName.String
		v.CityCode = row.CityCode.String
		v.CityName = row.CityName.String
		v.ProvinceName = row.ProvinceName.String
		v.LineColor = row.LineColor.String
		v.OpenTime = row.OpenTime.String
		v.UpDirection = row.UpDir.String
		v.DownDirection = row.DownDir.String
		v.Devicemodels = row.Dev.String
		v.LineIntroduction = row.Intro.String
		v.OverviewCompressed = row.Overview.String
		if row.LineLength.Valid {
			v.LineLength = decimal.NewFromFloat(row.LineLength.Float64)
		}
		if row.StationNum.Valid {
			sn := int(row.StationNum.Int64)
			v.StationNum = &sn
		}
		out = append(out, *v)
	}
	return out, nil
}

// GetCityStations 城市车站列表（分页）（对应 Java getCityStations + getCityStationCount）
func (r *OohRepo) GetCityStations(ctx context.Context, cityCode string, limit, offset int) ([]model.StationSimpleVO, error) {
	inClause, inArgs := r.cityCodeOrMetroArgs(ctx, cityCode)
	q := fmt.Sprintf(`
		SELECT
			s.original_station_id AS stationId, s.name AS stationName,
			ANY_VALUE(l.citycode) AS cityCode, ANY_VALUE(l.cityname) AS cityName,
			ANY_VALUE(s.longitude) AS longitude, ANY_VALUE(s.latitude) AS latitude,
			CASE WHEN COUNT(DISTINCT SUBSTRING_INDEX(l.name, '(', 1)) > 1 THEN 1 ELSE 0 END AS isTransfer,
			MIN(s.line_id) AS lineId,
			GROUP_CONCAT(DISTINCT s.line_id ORDER BY s.line_id SEPARATOR ',') AS lineIdsStr,
			GROUP_CONCAT(DISTINCT l.name ORDER BY s.line_id SEPARATOR ',') AS lineNamesStr,
			MAX(pop.number) AS population
		FROM sw_rim_station s
		INNER JOIN sw_rim_line l ON s.line_id = l.id
		LEFT JOIN (
			SELECT station_id, number FROM (
				SELECT p.station_id, p.number,
					ROW_NUMBER() OVER (PARTITION BY p.station_id ORDER BY p.id DESC) AS rn
				FROM sw_station_population p
				INNER JOIN sw_duration d ON p.duration_id = d.id AND d.status = 1
				WHERE p.person_type = 1
			) t WHERE rn = 1
		) pop ON s.original_station_id = pop.station_id
		WHERE l.citycode IN %s AND s.enabled = 1
		GROUP BY s.original_station_id, s.name
		ORDER BY MAX(pop.number) DESC, MIN(l.original_line_id), MIN(s.sequence)
		LIMIT ? OFFSET ?
	`, inClause)
	args := append(inArgs, limit, offset)

	var rows []struct {
		StationID                            sql.NullInt64  `db:"stationId"`
		StationName                          sql.NullString `db:"stationName"`
		CityCode                             sql.NullString `db:"cityCode"`
		CityName                             sql.NullString `db:"cityName"`
		Lon                                  sql.NullFloat64 `db:"longitude"`
		Lat                                  sql.NullFloat64 `db:"latitude"`
		IsTransfer                           sql.NullInt64  `db:"isTransfer"`
		LineID                               sql.NullInt64  `db:"lineId"`
		LineIDsStr                           sql.NullString `db:"lineIdsStr"`
		LineNamesStr                         sql.NullString `db:"lineNamesStr"`
		Population                           sql.NullInt64  `db:"population"`
	}
	if err := r.db.SelectContext(ctx, &rows, q, args...); err != nil {
		return nil, fmt.Errorf("get city stations: %w", err)
	}
	out := make([]model.StationSimpleVO, 0, len(rows))
	for _, row := range rows {
		v := model.StationSimpleVO{
			StationID:    row.StationID.Int64,
			StationName:  row.StationName.String,
			CityCode:     row.CityCode.String,
			CityName:     row.CityName.String,
			IsTransfer:   row.IsTransfer.Int64 == 1,
			LineID:       row.LineID.Int64,
			LineNamesStr: row.LineNamesStr.String,
			LineIDsStr:   row.LineIDsStr.String,
			Population:   row.Population.Int64,
		}
		if row.Lon.Valid {
			v.Longitude = decimal.NewFromFloat(row.Lon.Float64)
		}
		if row.Lat.Valid {
			v.Latitude = decimal.NewFromFloat(row.Lat.Float64)
		}
		out = append(out, v)
	}
	return out, nil
}

// GetCityStationCount 城市车站总数（对应 Java getCityStationCount）
func (r *OohRepo) GetCityStationCount(ctx context.Context, cityCode string) (int, error) {
	inClause, inArgs := r.cityCodeOrMetroArgs(ctx, cityCode)
	q := fmt.Sprintf(`
		SELECT COUNT(DISTINCT s.original_station_id)
		FROM sw_rim_station s
		INNER JOIN sw_rim_line l ON s.line_id = l.id
		WHERE l.citycode IN %s AND s.enabled = 1
	`, inClause)
	var count int
	if err := r.db.GetContext(ctx, &count, q, inArgs...); err != nil {
		return 0, fmt.Errorf("get city station count: %w", err)
	}
	return count, nil
}

// ==================== 线路 ====================

// GetLineDetail 线路详情（对应 Java getLineDetail）。lineID 支持 id 或 original_line_id
func (r *OohRepo) GetLineDetail(ctx context.Context, lineID int64) (*model.LineVO, error) {
	const q = `
		SELECT
			l.id, l.original_line_id, l.name, l.citycode, l.cityname, l.provincename,
			COALESCE(li.length, l.length) AS lineLength,
			COALESCE(li.colorname, l.color) AS lineColor,
			l.runTime AS operationStartTime, l.operator AS operationCompany,
			COALESCE(li.line_introduction, l.introduce) AS description,
			ci.overview_compressed AS logoUrl,
			li.stationnum, li.open_time,
			COALESCE(li.upDirection, l.upDirection) AS upDirection,
			COALESCE(li.downDirection, l.downDirection) AS downDirection,
			COALESCE(li.devicemodels, l.devicemodels) AS devicemodels,
			li.overview_compressed AS overviewCompressed
		FROM sw_rim_line l
		LEFT JOIN sw_rim_city_image ci ON l.cityname = ci.cityname COLLATE utf8mb4_unicode_ci
		LEFT JOIN sw_rim_line_image li ON FIND_IN_SET(l.original_line_id, li.original_line_id)
		WHERE (l.id = ? OR l.original_line_id = ?) AND l.enabled = 1
		ORDER BY l.id LIMIT 1
	`
	v := model.NewLineVO()
	var (
		lineLength sql.NullFloat64
		stationNum sql.NullInt64
		runTime, operator, desc, logo, openTime, upDir, downDir, dev, overview sql.NullString
	)
	if err := r.db.QueryRowxContext(ctx, q, lineID, lineID).Scan(
		&v.LineID, &v.OriginalLineID, &v.LineName, &v.CityCode, &v.CityName, &v.ProvinceName,
		&lineLength, &v.LineColor, &runTime, &operator, &desc, &logo, &stationNum, &openTime,
		&upDir, &downDir, &dev, &overview,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get line detail: %w", err)
	}
	v.OperationStartTime = runTime.String
	v.OperationCompany = operator.String
	v.Description = desc.String
	v.LogoURL = logo.String
	v.OpenTime = openTime.String
	v.UpDirection = upDir.String
	v.DownDirection = downDir.String
	v.Devicemodels = dev.String
	v.OverviewCompressed = overview.String
	if lineLength.Valid {
		v.LineLength = decimal.NewFromFloat(lineLength.Float64)
	}
	if stationNum.Valid {
		sn := int(stationNum.Int64)
		v.StationNum = &sn
	}
	return v, nil
}

// GetLineStations 线路车站（按 sequence）（对应 Java getLineStations）。originalLineID 为线路原始 ID
func (r *OohRepo) GetLineStations(ctx context.Context, originalLineID int64) ([]model.StationSimpleVO, error) {
	const q = `
		SELECT
			s.original_station_id AS stationId, s.name AS stationName,
			l.citycode AS cityCode, l.cityname AS cityName,
			s.longitude, s.latitude,
			CASE WHEN (
			    SELECT COUNT(DISTINCT SUBSTRING_INDEX(l2.name, '(', 1))
			    FROM sw_rim_station s2
			    INNER JOIN sw_rim_line l2 ON s2.line_id = l2.id
			    WHERE s2.original_station_id = s.original_station_id AND s2.enabled = 1
			) > 1 THEN 1 ELSE 0 END AS isTransfer,
			s.line_id AS lineId, l.name AS lineName, MAX(pop.number) AS population
		FROM sw_rim_station s
		INNER JOIN sw_rim_line l ON s.line_id = l.id
		LEFT JOIN (
			SELECT station_id, number FROM (
				SELECT p.station_id, p.number,
					ROW_NUMBER() OVER (PARTITION BY p.station_id ORDER BY p.id DESC) AS rn
				FROM sw_station_population p
				INNER JOIN sw_duration d ON p.duration_id = d.id AND d.status = 1
				WHERE p.person_type = 1
			) t WHERE rn = 1
		) pop ON s.original_station_id = pop.station_id
		WHERE s.original_line_id = ? AND s.enabled = 1
		GROUP BY s.original_station_id, s.name, l.citycode, l.cityname, s.longitude, s.latitude, s.line_id, l.name
		ORDER BY MIN(s.sequence)
	`
	var rows []struct {
		StationID              sql.NullInt64  `db:"stationId"`
		StationName            sql.NullString `db:"stationName"`
		CityCode               sql.NullString `db:"cityCode"`
		CityName               sql.NullString `db:"cityName"`
		Lon                    sql.NullFloat64 `db:"longitude"`
		Lat                    sql.NullFloat64 `db:"latitude"`
		IsTransfer             sql.NullInt64  `db:"isTransfer"`
		LineID                 sql.NullInt64  `db:"lineId"`
		LineName               sql.NullString `db:"lineName"`
		Population             sql.NullInt64  `db:"population"`
	}
	if err := r.db.SelectContext(ctx, &rows, q, originalLineID); err != nil {
		return nil, fmt.Errorf("get line stations: %w", err)
	}
	out := make([]model.StationSimpleVO, 0, len(rows))
	for _, row := range rows {
		v := model.StationSimpleVO{
			StationID:   row.StationID.Int64,
			StationName: row.StationName.String,
			CityCode:    row.CityCode.String,
			CityName:    row.CityName.String,
			IsTransfer:  row.IsTransfer.Int64 == 1,
			LineID:      row.LineID.Int64,
			LineName:    row.LineName.String,
			Population:  row.Population.Int64,
		}
		if row.Lon.Valid {
			v.Longitude = decimal.NewFromFloat(row.Lon.Float64)
		}
		if row.Lat.Valid {
			v.Latitude = decimal.NewFromFloat(row.Lat.Float64)
		}
		out = append(out, v)
	}
	return out, nil
}

// ==================== 业态明细 ====================

// GetStationBusinessList 业态配套列表（对应 Java getStationBusinessList → BusinessVO）
// durationID 为 nil 取最新 status=1 版本
func (r *OohRepo) GetStationBusinessList(ctx context.Context, stationID int64, durationID *int, limit int) ([]model.BusinessVO, error) {
	var q string
	var args []any
	if durationID == nil {
		q = `
			SELECT b.id, ii.industry_name, ii.industry_type, b.station_id, b.number, b.density_compare
			FROM sw_station_business b
			INNER JOIN sw_industry_info ii ON b.industry_id = ii.industry_id
			WHERE b.station_id = ? AND b.deleted = 0
			  AND b.duration_id = (
			      SELECT b2.duration_id FROM sw_station_business b2
			      INNER JOIN sw_duration d2 ON b2.duration_id = d2.id AND d2.status = 1
			      WHERE b2.station_id = ? AND b2.deleted = 0
			      ORDER BY d2.start_date DESC, d2.id DESC, b2.duration_id DESC LIMIT 1
			  )
			ORDER BY b.number DESC LIMIT ? `
		args = []any{stationID, stationID, limit}
	} else {
		q = `
			SELECT b.id, ii.industry_name, ii.industry_type, b.station_id, b.number, b.density_compare
			FROM sw_station_business b
			INNER JOIN sw_industry_info ii ON b.industry_id = ii.industry_id
			WHERE b.station_id = ? AND b.deleted = 0 AND b.duration_id = ?
			ORDER BY b.number DESC LIMIT ? `
		args = []any{stationID, *durationID, limit}
	}

	var rows []struct {
		ID             sql.NullInt64  `db:"id"`
		IndustryName   sql.NullString `db:"industry_name"`
		IndustryType   sql.NullInt64  `db:"industry_type"`
		StationID      sql.NullInt64  `db:"station_id"`
		Number         sql.NullInt64  `db:"number"`
		DensityCompare sql.NullString `db:"density_compare"`
	}
	if err := r.db.SelectContext(ctx, &rows, q, args...); err != nil {
		return nil, fmt.Errorf("get station business list: %w", err)
	}
	out := make([]model.BusinessVO, 0, len(rows))
	for _, row := range rows {
		out = append(out, model.BusinessVO{
			BusinessID:     row.ID.Int64,
			IndustryName:   row.IndustryName.String,
			IndustryType:   int(row.IndustryType.Int64),
			StationID:      row.StationID.Int64,
			Number:         int(row.Number.Int64),
			DensityCompare: row.DensityCompare.String,
		})
	}
	return out, nil
}

// GetBusinessDetail 业态详情（对应 Java queryByIndustryType）
// industryType 实为业态记录 b.id（Java 代码注释说明），keyword 商铺名模糊
func (r *OohRepo) GetBusinessDetail(ctx context.Context, stationID int64, durationID *int, industryID *int64, keyword string, limit int) ([]model.BusinessDetailVO, error) {
	q := `
		SELECT bd.id, ii.industry_name, ii.industry_type, bd.business_name, bd.distance,
		       bd.house_number, bd.price, bd.area, bd.rent_day, bd.rent_month, bd.floor, bd.rent_area
		FROM sw_station_business_detail bd
		INNER JOIN sw_station_business b ON bd.sb_id = b.id
		INNER JOIN sw_industry_info ii ON b.industry_id = ii.industry_id
		WHERE bd.station_id = ? AND b.deleted = 0
	`
	args := []any{stationID}
	if industryID != nil {
		q += ` AND b.id = ? `
		args = append(args, *industryID)
	}
	if durationID == nil {
		q += ` AND b.duration_id = (
			SELECT b2.duration_id FROM sw_station_business b2
			INNER JOIN sw_duration d2 ON b2.duration_id = d2.id AND d2.status = 1
			WHERE b2.station_id = ? AND b2.deleted = 0
			ORDER BY d2.start_date DESC, d2.id DESC, b2.duration_id DESC LIMIT 1
		) `
		args = append(args, stationID)
	} else {
		q += ` AND b.duration_id = ? `
		args = append(args, *durationID)
	}
	if keyword != "" {
		q += ` AND bd.business_name LIKE CONCAT('%', ?, '%') `
		args = append(args, keyword)
	}
	q += ` ORDER BY bd.distance ASC LIMIT ? `
	args = append(args, limit)

	var rows []struct {
		ID                       sql.NullInt64  `db:"id"`
		IndustryName             sql.NullString `db:"industry_name"`
		IndustryType             sql.NullInt64  `db:"industry_type"`
		BusinessName             sql.NullString `db:"business_name"`
		Distance                 sql.NullFloat64 `db:"distance"`
		HouseNumber              sql.NullInt64  `db:"house_number"`
		Price                    sql.NullFloat64 `db:"price"`
		Area                     sql.NullFloat64 `db:"area"`
		RentDay                  sql.NullFloat64 `db:"rent_day"`
		RentMonth                sql.NullFloat64 `db:"rent_month"`
		Floor                    sql.NullInt64  `db:"floor"`
		RentArea                 sql.NullFloat64 `db:"rent_area"`
	}
	if err := r.db.SelectContext(ctx, &rows, q, args...); err != nil {
		return nil, fmt.Errorf("get business detail: %w", err)
	}
	out := make([]model.BusinessDetailVO, 0, len(rows))
	for _, row := range rows {
		v := model.BusinessDetailVO{
			DetailID:     row.ID.Int64,
			IndustryName: row.IndustryName.String,
			IndustryType: int(row.IndustryType.Int64),
			BusinessName: row.BusinessName.String,
			HouseNumber:  int(row.HouseNumber.Int64),
			Floor:        int(row.Floor.Int64),
		}
		if row.Distance.Valid {
			v.Distance = decimal.NewFromFloat(row.Distance.Float64)
		}
		if row.Price.Valid {
			v.Price = decimal.NewFromFloat(row.Price.Float64)
		}
		if row.Area.Valid {
			v.Area = decimal.NewFromFloat(row.Area.Float64)
		}
		if row.RentDay.Valid {
			v.RentDay = decimal.NewFromFloat(row.RentDay.Float64)
		}
		if row.RentMonth.Valid {
			v.RentMonth = decimal.NewFromFloat(row.RentMonth.Float64)
		}
		if row.RentArea.Valid {
			v.RentArea = decimal.NewFromFloat(row.RentArea.Float64)
		}
		out = append(out, v)
	}
	return out, nil
}

// ==================== city-durations ====================

// ListAllDurations 所有城市季度（对应 Java listAllDurations）
func (r *OohRepo) ListAllDurations(ctx context.Context) ([]model.DurationInfo, error) {
	const q = `
		SELECT d.id, d.citycode, d.cityname, d.start_date, d.end_date, d.description, d.status
		FROM sw_duration d
		ORDER BY d.citycode, d.start_date DESC
	`
	var rows []struct {
		ID          sql.NullInt64  `db:"id"`
		CityCode    sql.NullString `db:"citycode"`
		CityName    sql.NullString `db:"cityname"`
		StartDate   sql.NullString `db:"start_date"`
		EndDate     sql.NullString `db:"end_date"`
		Description sql.NullString `db:"description"`
		Status      sql.NullInt64  `db:"status"`
	}
	if err := r.db.SelectContext(ctx, &rows, q); err != nil {
		return nil, fmt.Errorf("list all durations: %w", err)
	}
	out := make([]model.DurationInfo, 0, len(rows))
	for _, row := range rows {
		out = append(out, model.DurationInfo{
			DurationID:  int(row.ID.Int64),
			CityCode:    row.CityCode.String,
			CityName:    row.CityName.String,
			StartDate:   row.StartDate.String,
			EndDate:     row.EndDate.String,
			Description: row.Description.String,
			Status:      int(row.Status.Int64),
		})
	}
	return out, nil
}

// ListDurationsByCity 指定城市季度（对应 Java listDurationsByCity）
func (r *OohRepo) ListDurationsByCity(ctx context.Context, cityCode string) ([]model.DurationInfo, error) {
	const q = `
		SELECT d.id, d.citycode, d.cityname, d.start_date, d.end_date, d.description, d.status
		FROM sw_duration d
		WHERE (d.citycode = ? OR d.cityname = ?)
		ORDER BY d.start_date DESC
	`
	var rows []struct {
		ID          sql.NullInt64  `db:"id"`
		CityCode    sql.NullString `db:"citycode"`
		CityName    sql.NullString `db:"cityname"`
		StartDate   sql.NullString `db:"start_date"`
		EndDate     sql.NullString `db:"end_date"`
		Description sql.NullString `db:"description"`
		Status      sql.NullInt64  `db:"status"`
	}
	if err := r.db.SelectContext(ctx, &rows, q, cityCode, cityCode); err != nil {
		return nil, fmt.Errorf("list durations by city: %w", err)
	}
	out := make([]model.DurationInfo, 0, len(rows))
	for _, row := range rows {
		out = append(out, model.DurationInfo{
			DurationID:  int(row.ID.Int64),
			CityCode:    row.CityCode.String,
			CityName:    row.CityName.String,
			StartDate:   row.StartDate.String,
			EndDate:     row.EndDate.String,
			Description: row.Description.String,
			Status:      int(row.Status.Int64),
		})
	}
	return out, nil
}

// parseLineIDs/LineNames 辅助：把 "1,2,3" 字符串解析成切片（前端用）
func parseLineIDs(s string) []int64 {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	out := make([]int64, 0, len(parts))
	for _, p := range parts {
		if id, err := strconv.ParseInt(strings.TrimSpace(p), 10, 64); err == nil {
			out = append(out, id)
		}
	}
	return out
}

func parseLineNames(s string) []string {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		out = append(out, strings.TrimSpace(p))
	}
	return out
}
