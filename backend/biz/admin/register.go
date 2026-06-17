package admin

import (
	"github.com/samber/do"

	v1 "github.com/nidao003/mclaw/backend/biz/admin/handler/v1"
)

func ProvideAdmin(i *do.Injector) {
	do.Provide(i, v1.NewAdminHandler)
}

func InvokeAdmin(i *do.Injector) {
	do.MustInvoke[*v1.AdminHandler](i)
}
