package expert

import (
	"github.com/samber/do"

	v1 "github.com/nidao003/mclaw/backend/biz/expert/handler/v1"
	"github.com/nidao003/mclaw/backend/biz/expert/repo"
	"github.com/nidao003/mclaw/backend/biz/expert/usecase"
)

func ProvideExpert(i *do.Injector) {
	do.Provide(i, repo.NewExpertRepo)
	do.Provide(i, usecase.NewExpertUsecase)
	do.Provide(i, v1.NewExpertHandler)
}

func InvokeExpert(i *do.Injector) {
	do.MustInvoke[*v1.ExpertHandler](i)
}
