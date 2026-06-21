package skill

import (
	"github.com/samber/do"

	v1 "github.com/nidao003/mclaw/backend/biz/skill/handler/v1"
	"github.com/nidao003/mclaw/backend/biz/skill/repo"
	"github.com/nidao003/mclaw/backend/biz/skill/usecase"
)

func ProvideSkill(i *do.Injector) {
	do.Provide(i, repo.NewSkillRepo)
	do.Provide(i, repo.NewSkillVersionRepo)
	do.Provide(i, repo.NewSkillReviewRepo)
	do.Provide(i, repo.NewSkillRatingRepo)
	do.Provide(i, usecase.NewSkillUsecase)
	do.Provide(i, v1.NewSkillHandler)
	do.Provide(i, v1.NewSkillAdminHandler)
}

func InvokeSkill(i *do.Injector) {
	do.MustInvoke[*v1.SkillHandler](i)
	do.MustInvoke[*v1.SkillAdminHandler](i)
}
