package biz

import (
	"context"

	"github.com/google/uuid"
	"github.com/samber/do"

	"github.com/nidao003/mclaw/backend/biz/billing"
	"github.com/nidao003/mclaw/backend/biz/data"
	"github.com/nidao003/mclaw/backend/biz/file"
	"github.com/nidao003/mclaw/backend/biz/admin"
	"github.com/nidao003/mclaw/backend/biz/expert"
	"github.com/nidao003/mclaw/backend/biz/llmproxy"
	"github.com/nidao003/mclaw/backend/biz/payment"
	"github.com/nidao003/mclaw/backend/biz/notify"
	"github.com/nidao003/mclaw/backend/biz/public"
	"github.com/nidao003/mclaw/backend/biz/skill"
	"github.com/nidao003/mclaw/backend/biz/setting"
	"github.com/nidao003/mclaw/backend/biz/static"
	"github.com/nidao003/mclaw/backend/biz/subscription"
	"github.com/nidao003/mclaw/backend/biz/uploader"
	"github.com/nidao003/mclaw/backend/biz/user"
	"github.com/nidao003/mclaw/backend/biz/wallet"
	"github.com/nidao003/mclaw/backend/consts"
	"github.com/nidao003/mclaw/backend/domain"
)

// RegisterAll 注册核心 biz 模块（mclaw 必需）
// 分两阶段：先 Provide（懒注册），再 Invoke（解析依赖），避免模块间循环依赖
func RegisterAll(i *do.Injector) error {
	notify.ProvideNotify(i)
	public.ProvidePublic(i)
	user.ProvideUser(i)
	setting.ProvideSetting(i)
	file.ProvideFile(i)

	// 开源版模块
	subscription.ProvideSubscription(i)
	wallet.ProvideWallet(i)
	billing.ProvideBilling(i)
	data.ProvideData(i)
	skill.ProvideSkill(i)
	expert.ProvideExpert(i)
	payment.ProvidePayment(i)
	admin.ProvideAdmin(i)
	uploader.ProvideUploader(i)
	llmproxy.ProvideLLMProxy(i)
	static.ProviderStatic(i)
	do.ProvideValue[domain.TaskHook](i, &taskhook{})

	return nil
}

// InvokeAll 激活核心 biz 模块
func InvokeAll(i *do.Injector) {
	notify.InvokeNotify(i)
	public.InvokePublic(i)
	user.InvokeUser(i)
	setting.InvokeSetting(i)
	file.InvokeFile(i)

	// 开源版模块
	subscription.InvokeSubscription(i)
	wallet.InvokeWallet(i)
	billing.InvokeBilling(i)
	data.InvokeData(i)
	skill.InvokeSkill(i)
	expert.InvokeExpert(i)
	payment.InvokePayment(i)
	admin.InvokeAdmin(i)
	uploader.InvokeUploader(i)
	llmproxy.InvokeLLMProxy(i)
	static.InvokeStatic(i)
}

// RegisterOpenSource 兼容 MonkeyCode 入口调用，mclaw 中已合并到 RegisterAll
func RegisterOpenSource(i *do.Injector) {
	// mclaw: 已合并到 RegisterAll，此函数保留兼容性
}

// InvokeOpenSource 兼容 MonkeyCode 入口调用，mclaw 中已合并到 InvokeAll
func InvokeOpenSource(i *do.Injector) {
	// mclaw: 已合并到 InvokeAll，此函数保留兼容性
}

type taskhook struct{}

// GetMaxConcurrent implements [domain.TaskHook].
func (t *taskhook) GetMaxConcurrent(ctx context.Context, uid uuid.UUID) (int, error) {
	return 3, nil
}

// GetSystemPrompt implements [domain.TaskHook].
func (t *taskhook) GetSystemPrompt(ctx context.Context, taskType consts.TaskType, subType consts.TaskSubType) (string, error) {
	return "", nil
}

// GitTask implements [domain.TaskHook].
func (t *taskhook) GitTask(ctx context.Context, id uuid.UUID) (*domain.GitTask, error) {
	return &domain.GitTask{}, nil
}

// OnTaskCreated implements [domain.TaskHook].
func (t *taskhook) OnTaskCreated(ctx context.Context, task *domain.ProjectTask) error {
	return nil
}

var _ domain.TaskHook = &taskhook{}
