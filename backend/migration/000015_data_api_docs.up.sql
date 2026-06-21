-- 000015: 补充数据 API 文档元数据（params/response_fields/example_request/example_response）
-- 对 18 个接口补充 API 文档页所需的参数表、响应字段表、curl/JSON 示例
-- UPDATE 现有 data_api_pricings 行（000014 已 seed 基础信息）

-- 通用请求头说明（前端固定渲染，无需每接口存）
-- 通用响应：{ code, msg, data }（Go c.Success envelope）

-- ============ 车站画像 ============

UPDATE data_api_pricings SET
  summary='查询车站完整画像，含基础信息、4类人口、常驻18+到访5标签、业态汇总、产业数据',
  params='[{"name":"id","type":"long","required":true,"desc":"车站原始ID","example":"900000028566019"},{"name":"durationId","type":"int","required":false,"desc":"季度ID，不传取最新","example":""}]'::jsonb,
  response_fields='[{"field":"stationId","type":"long","desc":"车站ID"},{"field":"stationName","type":"string","desc":"车站名称"},{"field":"cityName","type":"string","desc":"城市名称"},{"field":"lineName","type":"string","desc":"线路名称(多线路逗号分隔)"},{"field":"residentPopulation","type":"object","desc":"常驻人口"},{"field":"residentLabels","type":"map","desc":"常驻人群标签分布"},{"field":"businessSummaries","type":"array","desc":"业态汇总"},{"field":"industryData","type":"object","desc":"产业数据"}]'::jsonb,
  example_request='curl -X GET "https://<api-host>/api/v1/data/stations/900000028566019" -H "X-API-Key: your_api_key"',
  example_response='{"code":0,"msg":"success","data":{"stationId":900000028566019,"stationName":"国贸","cityName":"北京","lineName":"1号线,10号线","isTransfer":true,"residentPopulation":{"number":12345,"numberUnit":"人"},"businessSummaries":[],"industryData":{}}}'
WHERE api_code='station.detail';

UPDATE data_api_pricings SET summary='查询车站人口数据，支持常驻/到访/工作/居住4类人群',
  params='[{"name":"id","type":"long","required":true,"desc":"车站原始ID"},{"name":"personType","type":"int","required":false,"desc":"1常驻2到访3工作4居住，默认1"},{"name":"durationId","type":"int","required":false,"desc":"季度ID"}]'::jsonb,
  response_fields='[{"field":"number","type":"long","desc":"人数"},{"field":"density","type":"decimal","desc":"人口密度"},{"field":"cityRatio","type":"decimal","desc":"全市占比"}]'::jsonb,
  example_request='curl -X GET "https://<api-host>/api/v1/data/stations/900000028566019/population?personType=1" -H "X-API-Key: your_api_key"'
WHERE api_code='station.population';

UPDATE data_api_pricings SET summary='查询车站人群标签分布，常驻18个+到访5个标签',
  params='[{"name":"id","type":"long","required":true,"desc":"车站原始ID"},{"name":"personType","type":"int","required":false,"desc":"1常驻2到访，不传返回全部(带前缀)"},{"name":"durationId","type":"int","required":false,"desc":"季度ID"}]'::jsonb,
  response_fields='[{"field":"性别标签","type":"array","desc":"[{valueRange,ratio}]"},{"field":"年龄标签","type":"array","desc":"年龄分布"}]'::jsonb,
  example_request='curl -X GET "https://<api-host>/api/v1/data/stations/900000028566019/labels?personType=1" -H "X-API-Key: your_api_key"'
WHERE api_code='station.labels';

UPDATE data_api_pricings SET summary='查询车站业态配套汇总',
  params='[{"name":"id","type":"long","required":true,"desc":"车站原始ID"},{"name":"durationId","type":"int","required":false,"desc":"季度ID"}]'::jsonb,
  response_fields='[{"field":"businessId","type":"long","desc":"业态记录ID"},{"field":"industryName","type":"string","desc":"业态名称"},{"field":"number","type":"int","desc":"数量"}]'::jsonb,
  example_request='curl -X GET "https://<api-host>/api/v1/data/stations/900000028566019/business" -H "X-API-Key: your_api_key"'
WHERE api_code='station.business';

UPDATE data_api_pricings SET summary='查询车站产业数据（房价/物业/建筑/商铺写字楼租赁）',
  params='[{"name":"id","type":"long","required":true,"desc":"车站原始ID"},{"name":"durationId","type":"int","required":false,"desc":"季度ID"}]'::jsonb,
  response_fields='[{"field":"avgHousePrice","type":"decimal","desc":"房屋均价"},{"field":"avgPropertyFee","type":"decimal","desc":"物业费"},{"field":"officeRentAvgMonth","type":"decimal","desc":"写字楼月租金"}]'::jsonb,
  example_request='curl -X GET "https://<api-host>/api/v1/data/stations/900000028566019/industry" -H "X-API-Key: your_api_key"'
WHERE api_code='station.industry';

-- ============ 城市 ============

UPDATE data_api_pricings SET summary='查询城市基本信息（名称/线路数/车站数/客运量）',
  params='[{"name":"code","type":"string","required":true,"desc":"城市编码(数字110100或拼音beijing)","example":"beijing"}]'::jsonb,
  response_fields='[{"field":"cityCode","type":"string","desc":"城市编码"},{"field":"cityName","type":"string","desc":"城市名称"},{"field":"lineOpen","type":"int","desc":"开通线路数"},{"field":"currentPassengerFlow","type":"decimal","desc":"当前客运量(万人次)"}]'::jsonb,
  example_request='curl -X GET "https://<api-host>/api/v1/data/cities/beijing" -H "X-API-Key: your_api_key"',
  example_response='{"code":0,"msg":"success","data":{"cityCode":"beijing","cityName":"北京","lineOpen":27,"currentPassengerFlow":1200.5}}'
WHERE api_code='city.detail';

UPDATE data_api_pricings SET summary='查询城市全部历史记录（按日期倒序，最多500条）',
  params='[{"name":"code","type":"string","required":true,"desc":"城市编码"}]'::jsonb,
  response_fields='[{"field":"dataDate","type":"string","desc":"数据日期"},{"field":"currentPassengerFlow","type":"decimal","desc":"当日客流"}]'::jsonb,
  example_request='curl -X GET "https://<api-host>/api/v1/data/cities/beijing/all" -H "X-API-Key: your_api_key"'
WHERE api_code='city.all';

UPDATE data_api_pricings SET summary='查询城市客流，不传yearMonth返回最新一天，传返回当月每日',
  params='[{"name":"code","type":"string","required":true,"desc":"城市编码"},{"name":"yearMonth","type":"string","required":false,"desc":"年月(2026-01)","example":"2026-01"}]'::jsonb,
  response_fields='[{"field":"currentFlow","type":"decimal","desc":"当前客流"},{"field":"dailyFlows","type":"array","desc":"当月每日(传yearMonth时)"}]'::jsonb,
  example_request='curl -X GET "https://<api-host>/api/v1/data/cities/beijing/passenger-flow?yearMonth=2026-01" -H "X-API-Key: your_api_key"'
WHERE api_code='city.passenger_flow';

UPDATE data_api_pricings SET summary='查询城市历史最高客流',
  params='[{"name":"code","type":"string","required":true,"desc":"城市编码"}]'::jsonb,
  response_fields='[{"field":"topFlow","type":"decimal","desc":"最高客流"},{"field":"dataDate","type":"string","desc":"创纪录日期"}]'::jsonb,
  example_request='curl -X GET "https://<api-host>/api/v1/data/cities/beijing/top-flow" -H "X-API-Key: your_api_key"'
WHERE api_code='city.top_flow';

UPDATE data_api_pricings SET summary='查询城市历年日均客流',
  params='[{"name":"code","type":"string","required":true,"desc":"城市编码"}]'::jsonb,
  response_fields='[{"field":"year","type":"int","desc":"年份"},{"field":"flowData","type":"string","desc":"日均客流"}]'::jsonb,
  example_request='curl -X GET "https://<api-host>/api/v1/data/cities/beijing/yearly-flow" -H "X-API-Key: your_api_key"'
WHERE api_code='city.yearly_flow';

UPDATE data_api_pricings SET summary='查询城市地铁线路列表',
  params='[{"name":"code","type":"string","required":true,"desc":"城市编码"}]'::jsonb,
  response_fields='[{"field":"lineId","type":"long","desc":"线路ID"},{"field":"lineName","type":"string","desc":"线路名称"},{"field":"lineColor","type":"string","desc":"线路颜色"}]'::jsonb,
  example_request='curl -X GET "https://<api-host>/api/v1/data/cities/beijing/lines" -H "X-API-Key: your_api_key"'
WHERE api_code='city.lines';

UPDATE data_api_pricings SET summary='查询城市车站列表（分页，按常驻人口降序）',
  params='[{"name":"code","type":"string","required":true,"desc":"城市编码"},{"name":"page","type":"int","required":false,"desc":"页码，默认1"},{"name":"pageSize","type":"int","required":false,"desc":"每页数，默认50"}]'::jsonb,
  response_fields='[{"field":"total","type":"int","desc":"总数"},{"field":"list","type":"array","desc":"车站列表"},{"field":"list[].stationName","type":"string","desc":"车站名"}]'::jsonb,
  example_request='curl -X GET "https://<api-host>/api/v1/data/cities/beijing/stations?page=1&pageSize=50" -H "X-API-Key: your_api_key"'
WHERE api_code='city.stations';

-- ============ 线路 ============

UPDATE data_api_pricings SET summary='查询线路详情（lineId支持id或original_line_id）',
  params='[{"name":"id","type":"long","required":true,"desc":"线路ID或原始线路ID"}]'::jsonb,
  response_fields='[{"field":"lineId","type":"long","desc":"线路ID"},{"field":"lineName","type":"string","desc":"线路名称"},{"field":"lineLength","type":"decimal","desc":"线路长度(km)"}]'::jsonb,
  example_request='curl -X GET "https://<api-host>/api/v1/data/lines/1001" -H "X-API-Key: your_api_key"'
WHERE api_code='line.detail';

UPDATE data_api_pricings SET summary='查询线路所有车站（按sequence排序）',
  params='[{"name":"id","type":"long","required":true,"desc":"线路ID或原始线路ID"}]'::jsonb,
  response_fields='[{"field":"stationId","type":"long","desc":"车站ID"},{"field":"stationName","type":"string","desc":"车站名"},{"field":"isTransfer","type":"bool","desc":"是否换乘"}]'::jsonb,
  example_request='curl -X GET "https://<api-host>/api/v1/data/lines/1001/stations" -H "X-API-Key: your_api_key"'
WHERE api_code='line.stations';

-- ============ 业态 ============

UPDATE data_api_pricings SET summary='查询车站业态配套列表(BusinessVO，含stationId)',
  params='[{"name":"id","type":"long","required":true,"desc":"车站原始ID"},{"name":"durationId","type":"int","required":false,"desc":"季度ID"},{"name":"limit","type":"int","required":false,"desc":"返回数，默认100"}]'::jsonb,
  response_fields='[{"field":"businessId","type":"long","desc":"业态ID"},{"field":"industryName","type":"string","desc":"业态名称"},{"field":"number","type":"int","desc":"数量"}]'::jsonb,
  example_request='curl -X GET "https://<api-host>/api/v1/data/stations/900000028566019/business-summary" -H "X-API-Key: your_api_key"'
WHERE api_code='business.summary';

UPDATE data_api_pricings SET summary='查询车站商铺级业态详情（支持按业态/关键词筛选）',
  params='[{"name":"id","type":"long","required":true,"desc":"车站原始ID"},{"name":"industryType","type":"long","required":false,"desc":"业态记录ID(b.id)"},{"name":"keyword","type":"string","required":false,"desc":"商铺名模糊"},{"name":"durationId","type":"int","required":false,"desc":"季度ID"}]'::jsonb,
  response_fields='[{"field":"businessName","type":"string","desc":"商铺名"},{"field":"distance","type":"decimal","desc":"距离"},{"field":"price","type":"decimal","desc":"价格"}]'::jsonb,
  example_request='curl -X GET "https://<api-host>/api/v1/data/stations/900000028566019/business-detail?keyword=咖啡" -H "X-API-Key: your_api_key"'
WHERE api_code='business.detail';

-- ============ 查询 ============

UPDATE data_api_pricings SET summary='车站名模糊搜索（支持去"站"字匹配，按人口排序）',
  params='[{"name":"name","type":"string","required":true,"desc":"车站名关键词"},{"name":"cityName","type":"string","required":false,"desc":"中文城市名"},{"name":"cityCode","type":"string","required":false,"desc":"城市编码"},{"name":"limit","type":"int","required":false,"desc":"返回数，默认10上限50"}]'::jsonb,
  response_fields='[{"field":"stationId","type":"long","desc":"车站ID"},{"field":"stationName","type":"string","desc":"车站名"},{"field":"cityName","type":"string","desc":"城市"},{"field":"hasData","type":"bool","desc":"是否有数据"}]'::jsonb,
  example_request='curl -X GET "https://<api-host>/api/v1/data/stations/search?name=国贸&limit=10" -H "X-API-Key: your_api_key"',
  example_response='{"code":0,"msg":"success","data":[{"stationId":900000028566019,"stationName":"国贸","cityName":"北京","hasData":true}]}'
WHERE api_code='query.search_stations';

UPDATE data_api_pricings SET summary='查询城市季度数据可用性（每城市有多少季度数据）',
  params='[{"name":"cityCode","type":"string","required":false,"desc":"城市编码或中文名，不传返回所有城市"}]'::jsonb,
  response_fields='[{"field":"cityCode","type":"string","desc":"城市编码"},{"field":"durationCount","type":"int","desc":"季度数"},{"field":"durations","type":"array","desc":"季度列表"}]'::jsonb,
  example_request='curl -X GET "https://<api-host>/api/v1/data/cities/durations?cityCode=beijing" -H "X-API-Key: your_api_key"'
WHERE api_code='query.city_durations';
