package billing

import (
	"github.com/samber/do"

	"github.com/nidao003/mclaw/backend/biz/billing/usecase"
	"github.com/nidao003/mclaw/backend/domain"
)

func ProvideBilling(i *do.Injector) {
	do.Provide(i, usecase.NewBillingUsecase)
}

func InvokeBilling(i *do.Injector) {
	do.MustInvoke[domain.BillingUsecase](i)
}
