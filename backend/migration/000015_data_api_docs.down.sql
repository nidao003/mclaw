-- 000015 down: 文档元数据无需回滚（清空补充字段即可，保留基础定价）
UPDATE data_api_pricings SET params=NULL, response_fields=NULL, example_request=NULL, example_response=NULL, summary=NULL;
