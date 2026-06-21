// Package oohdata 封装 ooh_data 远程只读 MySQL 连接池。
// 该库为车站/城市/线路等业务数据的只读来源，账号本身只读，
// 且本 client 只暴露查询方法（Select/Get/QueryRow），不提供任何写操作，双重保险。
package oohdata

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	_ "github.com/go-sql-driver/mysql" // 注册 mysql driver

	"github.com/nidao003/mclaw/backend/config"
)

// Client 是 ooh_data 只读 MySQL 连接池。
// 注意：严禁通过本 client 执行任何写操作（INSERT/UPDATE/DELETE/DDL）。
type Client struct {
	db *sqlx.DB
}

// New 创建 ooh_data 只读连接池。
func New(cfg *config.Config) (*Client, error) {
	dsn := cfg.Database.OohData.DSN
	if dsn == "" {
		// 未配置时返回 nil client，调用方需自行判空（数据 API 不可用）
		return nil, nil
	}

	db, err := sqlx.Connect("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("oohdata: connect failed: %w", err)
	}

	maxOpen := cfg.Database.OohData.MaxOpenConns
	maxIdle := cfg.Database.OohData.MaxIdleConns
	if maxOpen <= 0 {
		maxOpen = 20
	}
	if maxIdle <= 0 {
		maxIdle = 10
	}
	db.SetMaxOpenConns(maxOpen)
	db.SetMaxIdleConns(maxIdle)
	db.SetConnMaxLifetime(0) // 远程只读库，长连接复用

	return &Client{db: db}, nil
}

// DB 暴露底层 *sqlx.DB 供 repo 层使用。repo 层只能调用其查询方法。
// 未配置时返回 nil，repo.Available() 会返回 false，调用方应拦截。
func (c *Client) DB() *sqlx.DB {
	if c == nil {
		return nil
	}
	return c.db
}

// Close 关闭连接池。
func (c *Client) Close() error {
	if c == nil || c.db == nil {
		return nil
	}
	return c.db.Close()
}

// Ping 检查连接可用性。
func (c *Client) Ping(ctx context.Context) error {
	if c == nil || c.db == nil {
		return fmt.Errorf("oohdata: client not configured")
	}
	return c.db.PingContext(ctx)
}
