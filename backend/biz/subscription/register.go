package subscription

import (
	"github.com/samber/do"

	v1 "github.com/nidao003/mclaw/backend/biz/subscription/handler/v1"
	"github.com/nidao003/mclaw/backend/biz/subscription/repo"
	"github.com/nidao003/mclaw/backend/biz/subscription/usecase"
)

func ProvideSubscription(i *do.Injector) {
	do.Provide(i, repo.NewSubscriptionRepo)
	do.Provide(i, repo.NewPlanRepo)
	do.Provide(i, usecase.NewSubscriptionUsecase)
	do.Provide(i, usecase.NewPlanUsecase)
	do.Provide(i, v1.NewSubscriptionHandler)
}

func InvokeSubscription(i *do.Injector) {
	do.MustInvoke[*v1.SubscriptionHandler](i)
}
