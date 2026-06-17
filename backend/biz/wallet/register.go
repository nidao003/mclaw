package wallet

import (
	"github.com/samber/do"

	v1 "github.com/nidao003/mclaw/backend/biz/wallet/handler/v1"
	"github.com/nidao003/mclaw/backend/biz/wallet/repo"
	"github.com/nidao003/mclaw/backend/biz/wallet/usecase"
)

func ProvideWallet(i *do.Injector) {
	do.Provide(i, repo.NewWalletRepo)
	do.Provide(i, repo.NewTransactionRepo)
	do.Provide(i, repo.NewCheckInRepo)
	do.Provide(i, repo.NewInvitationRepo)
	do.Provide(i, repo.NewExchangeCodeRepo)
	do.Provide(i, usecase.NewWalletUsecase)
	do.Provide(i, v1.NewWalletHandler)
}

func InvokeWallet(i *do.Injector) {
	do.MustInvoke[*v1.WalletHandler](i)
}
