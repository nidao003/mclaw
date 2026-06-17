package payment

import (
	"github.com/samber/do"

	v1 "github.com/nidao003/mclaw/backend/biz/payment/handler/v1"
	"github.com/nidao003/mclaw/backend/biz/payment/repo"
	"github.com/nidao003/mclaw/backend/biz/payment/usecase"
)

func ProvidePayment(i *do.Injector) {
	do.Provide(i, repo.NewPaymentRepo)
	do.Provide(i, usecase.NewPaymentUsecase)
	do.Provide(i, v1.NewPaymentHandler)
}

func InvokePayment(i *do.Injector) {
	do.MustInvoke[*v1.PaymentHandler](i)
}
