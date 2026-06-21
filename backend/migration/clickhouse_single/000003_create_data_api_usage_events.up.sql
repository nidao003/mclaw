CREATE TABLE IF NOT EXISTS {{DATA_API_USAGE_TABLE}}
(
	event_time DateTime64(3, 'UTC'),
	user_id String,
	api_code LowCardinality(String),
	ref_id String,
	credits Int64,
	latency_ms UInt32,
	success UInt8,
	error_msg String,
	created_at DateTime64(3, 'UTC') DEFAULT now64(3, 'UTC')
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (user_id, event_time, api_code)
TTL toDateTime(event_time) + INTERVAL 400 DAY;
