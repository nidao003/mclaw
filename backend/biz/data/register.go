// Package data 数据 API 查询模块（车站/城市/线路/业态）。
// 数据源：ooh_data 远程只读 MySQL；鉴权：ApiKeyAuth；计费：按次扣 credit。
package data

import (
	"github.com/samber/do"

	v1 "github.com/nidao003/mclaw/backend/biz/data/handler/v1"
	"github.com/nidao003/mclaw/backend/biz/data/usecase"
)

// ProvideData 注册数据 API 模块依赖。
func ProvideData(i *do.Injector) {
	do.Provide(i, usecase.NewStationUsecase)
	do.Provide(i, usecase.NewCityUsecase)
	do.Provide(i, usecase.NewLineUsecase)
	do.Provide(i, usecase.NewBusinessUsecase)
	do.Provide(i, v1.NewBillingMiddleware)
	do.Provide(i, v1.NewStationHandler)
	do.Provide(i, v1.NewCityLineBizHandler)
	do.Provide(i, v1.NewDocsHandler)
}

// InvokeData 激活数据 API 模块（触发 handler 注册路由）。
func InvokeData(i *do.Injector) {
	do.MustInvoke[*v1.StationHandler](i)
	do.MustInvoke[*v1.CityLineBizHandler](i)
	do.MustInvoke[*v1.DocsHandler](i)
}
