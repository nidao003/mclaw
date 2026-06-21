// Package errcode 提供统一的错误码定义和国际化支持
package errcode

import (
	"embed"
	"errors"
	"net/http"

	"github.com/GoYoko/web"
)

// LocalFS 嵌入本地化文件系统
//
//go:embed locale.*.toml
var LocalFS embed.FS

// 框架层面的错误
var (
	ErrUnauthorized = web.NewErr(http.StatusUnauthorized, http.StatusUnauthorized, "err-unauthorized")
	ErrForbidden    = web.NewErr(http.StatusForbidden, http.StatusForbidden, "err-forbidden")
	ErrBadRequest   = web.NewErr(http.StatusBadRequest, http.StatusBadRequest, "err-bad-request")
)

// 业务层面的错误
var (
	// 通用的错误
	ErrInternalServer    = web.NewErr(http.StatusOK, 10000, "err-internal-server")
	ErrPermision         = web.NewErr(http.StatusOK, 10001, "err-permision-denied")
	ErrNotFound          = web.NewErr(http.StatusOK, 10002, "err-not-found")
	ErrDuplicate         = web.NewErr(http.StatusOK, 10003, "err-duplicate")
	ErrDatabaseQuery     = web.NewErr(http.StatusOK, 10004, "err-database-query")
	ErrDatabaseOperation = web.NewErr(http.StatusOK, 10005, "err-database-operation-failed")
	ErrHTTPRequest       = web.NewErr(http.StatusOK, 10006, "err-http-request-failed")
	ErrHasInvalidEntry   = web.NewErr(http.StatusOK, 10007, "err-has-invalid-entry")
	ErrStreamDisconnect  = web.NewErr(http.StatusOK, 10008, "err-stream-disconnect")

	// 业务模块特有的 错误码

	// 文件管理
	ErrFilePermisionDenied = web.NewErr(http.StatusOK, 10100, "err-file-permision-denied")
	ErrFileOp              = web.NewErr(http.StatusOK, 10101, "err-file-op")

	// 主机管理
	ErrVMIDRequired          = web.NewErr(http.StatusOK, 10200, "err-vm-id-required")
	ErrVMNotBelongToUser     = web.NewErr(http.StatusOK, 10201, "err-vm-not-belong-to-user")
	ErrPermisionDenied       = web.NewErr(http.StatusOK, 10202, "err-permision-denied")
	ErrInvalidInstallToken   = web.NewErr(http.StatusOK, 10203, "err-invalid-token")
	ErrPublicHostNotFound    = web.NewErr(http.StatusOK, 10204, "err-public-host-not-found")
	ErrHostOffline           = web.NewErr(http.StatusOK, 10205, "err-host-offline")
	ErrVMExpired             = web.NewErr(http.StatusOK, 10206, "err-vm-expired")
	ErrApplyPortFailed       = web.NewErr(http.StatusOK, 10207, "err-apply-port-failed")
	ErrRecyclePortFailed     = web.NewErr(http.StatusOK, 10208, "err-recycle-port-failed")
	ErrPublicHostCannotRenew = web.NewErr(http.StatusOK, 10209, "err-public-host-cannot-renew")
	ErrPublicHostBeyondLimit = web.NewErr(http.StatusOK, 10230, "err-public-host-beyond-limit")
	ErrVmRemoved             = web.NewErr(http.StatusOK, 10231, "err-vm-removed")
	ErrVmBeyondExpireTime    = web.NewErr(http.StatusOK, 10232, "err-vm-beyond-expire-time")

	// 模型配置管理
	ErrInvalidAPIKey    = web.NewErr(http.StatusOK, 10300, "err-model-id-required")
	ErrInvalidParameter = web.NewErr(http.StatusOK, 10301, "err-invalid-parameter")
	ErrModelNotFound    = web.NewErr(http.StatusOK, 10302, "err-model-not-found")
	ErrImageNotFound    = web.NewErr(http.StatusOK, 10303, "err-image-not-found")

	// 项目管理
	ErrInvalidPlatform            = web.NewErr(http.StatusOK, 10400, "err-invalid-platform")
	ErrInvalidToken               = web.NewErr(http.StatusOK, 10401, "err-invalid-token")
	ErrInvalidCollaborarator      = web.NewErr(http.StatusOK, 10402, "err-invalid-collaborarator")
	ErrUpdateProjectFailed        = web.NewErr(http.StatusOK, 10403, "err-update-project-failed")
	ErrGitOperation               = web.NewErr(http.StatusOK, 10404, "err-git-operation")
	ErrProjectGitIdentityRequired = web.NewErr(http.StatusOK, 10405, "err-project-git-identity-required")
	ErrRepoAlreadyLinked          = web.NewErr(http.StatusOK, 10406, "err-repo-already-linked")
	ErrGitIdentityInUseByProject  = web.NewErr(http.StatusOK, 10407, "err-git-identity-in-use-by-project")
	ErrForbiddenBaseURL           = web.NewErr(http.StatusOK, 10408, "err-forbidden-base-url")

	// 团队管理
	ErrTeamMemberLimitExceeded = web.NewErr(http.StatusOK, 10500, "err-team-member-limit-exceeded")
	ErrInvalidPassword         = web.NewErr(http.StatusOK, 10501, "err-invalid-password")
	ErrSMSFailed               = web.NewErr(http.StatusOK, 10502, "err-sms-failed")
	ErrUserAlreadyExists       = web.NewErr(http.StatusOK, 10503, "err-user-already-exists")
	ErrChangePasswordFailed    = web.NewErr(http.StatusOK, 10504, "err-change-password-failed")
	ErrPasswordHashFailed      = web.NewErr(http.StatusOK, 10505, "err-password-hash-failed")
	ErrPasswordLength          = web.NewErr(http.StatusOK, 10506, "err-password-length")

	// 用户管理
	ErrIdentityAlreadyBound          = web.NewErr(http.StatusOK, 10601, "err-identity-already-bound")
	ErrInvalidState                  = web.NewErr(http.StatusOK, 10602, "err-invalid-state")
	ErrNotLoggedIn                   = web.NewErr(http.StatusOK, 10603, "err-not-logged-in")
	ErrUserBlocked                   = web.NewErr(http.StatusOK, 10605, "err-user-blocked")
	ErrLoginFailed                   = web.NewErr(http.StatusOK, 10606, "err-login-failed")
	ErrInvalidCoupon                 = web.NewErr(http.StatusOK, 10607, "err-invalid-coupon")
	ErrResetPasswordFailed           = web.NewErr(http.StatusOK, 10608, "err-reset-password-failed")
	ErrWalletInsufficient            = web.NewErr(http.StatusOK, 10609, "err-wallet-insufficient")
	ErrAccountOverdraft              = web.NewErr(http.StatusOK, 10610, "err-account-overdraft")
	ErrEmailVerifyFailed             = web.NewErr(http.StatusOK, 10611, "err-email-verify-failed")
	ErrEmailAlreadyBound             = web.NewErr(http.StatusOK, 10612, "err-email-already-bound")
	ErrEmailTaken                    = web.NewErr(http.StatusOK, 10613, "err-email-taken")
	ErrEmailRequired                 = web.NewErr(http.StatusOK, 10614, "err-email-required")
	ErrEmailNotBound                 = web.NewErr(http.StatusOK, 10615, "err-email-not-bound")
	ErrEnterpriseResetPasswordDenied = web.NewErr(http.StatusOK, 10616, "err-enterprise-reset-password-denied")

	// captcha 模块
	ErrCreateCaptchaFailed = web.NewErr(http.StatusOK, 10700, "err-create-captcha-failed")
	ErrRedeemCaptchaFailed = web.NewErr(http.StatusOK, 10701, "err-redeem-captcha-failed")
	ErrCaptchaVerifyFailed = web.NewErr(http.StatusOK, 10702, "err-captcha-verify-failed")

	ErrDepositFailed = web.NewErr(http.StatusOK, 10801, "err-deposit-failed")

	// 任务管理
	ErrTaskCannotDelete     = web.NewErr(http.StatusOK, 10810, "err-task-cannot-delete")
	ErrTaskConcurrencyLimit = web.NewErr(http.StatusOK, 10811, "err-task-concurrency-limit")
	ErrModelAccessDenied    = web.NewErr(http.StatusOK, 10812, "err-model-access-denied")

	// 知识库索引管理
	ErrKBNilTree       = web.NewErr(http.StatusOK, 10900, "err-kb-nil-tree")
	ErrKBEmptyPath     = web.NewErr(http.StatusOK, 10901, "err-kb-empty-path")
	ErrKBPathNotFound  = web.NewErr(http.StatusOK, 10902, "err-kb-path-not-found")
	ErrKBNotFile       = web.NewErr(http.StatusOK, 10903, "err-kb-not-file")
	ErrKBNotDir        = web.NewErr(http.StatusOK, 10904, "err-kb-not-dir")
	ErrKBDirNotEmpty   = web.NewErr(http.StatusOK, 10905, "err-kb-dir-not-empty")
	ErrKBAlreadyExists = web.NewErr(http.StatusOK, 10906, "err-kb-already-exists")

	// 微信公众号
	ErrWechatMPNotBound = web.NewErr(http.StatusOK, 11200, "err-wechat-mp-not-bound")

		// 钱包/积分错误 (11000-11010)
		ErrWalletNotFound        = web.NewErr(http.StatusOK, 11000, "err-wallet-not-found")
		ErrInsufficientBalance   = web.NewErr(http.StatusOK, 11001, "err-insufficient-balance")
		ErrInsufficientTokenQuota = web.NewErr(http.StatusOK, 11002, "err-insufficient-token-quota")
		ErrAlreadyCheckedIn      = web.NewErr(http.StatusOK, 11003, "err-already-checked-in")
		ErrInvalidExchangeCode   = web.NewErr(http.StatusOK, 11004, "err-invalid-exchange-code")
		ErrExchangeCodeExpired   = web.NewErr(http.StatusOK, 11005, "err-exchange-code-expired")
		ErrExchangeCodeUsed      = web.NewErr(http.StatusOK, 11006, "err-exchange-code-used")

		// 订阅错误 (11100-11110)
		ErrPlanNotFound        = web.NewErr(http.StatusOK, 11100, "err-plan-not-found")
		ErrSubscriptionExpired = web.NewErr(http.StatusOK, 11101, "err-subscription-expired")
		ErrSubscriptionActive  = web.NewErr(http.StatusOK, 11102, "err-subscription-active")

		// 支付错误 (11210-11213)
		ErrOrderNotFound          = web.NewErr(http.StatusOK, 11210, "err-order-not-found")
		ErrOrderExpired           = web.NewErr(http.StatusOK, 11211, "err-order-expired")
		ErrPaymentFailed          = web.NewErr(http.StatusOK, 11212, "err-payment-failed")
		ErrPaymentCallbackFailed  = web.NewErr(http.StatusOK, 11213, "err-payment-callback-failed")

		// 技能市场错误 (11300-11310)
		ErrSkillNotFound         = web.NewErr(http.StatusOK, 11300, "err-skill-not-found")
		ErrSkillVersionConflict  = web.NewErr(http.StatusOK, 11301, "err-skill-version-conflict")
		ErrSkillReviewPending    = web.NewErr(http.StatusOK, 11302, "err-skill-review-pending")
		ErrSkillAlreadyRated     = web.NewErr(http.StatusOK, 11303, "err-skill-already-rated")
		ErrSkillVersionNotFound  = web.NewErr(http.StatusOK, 11304, "err-skill-version-not-found")

		// 专家错误 (11400-11410)
		ErrExpertNotFound = web.NewErr(http.StatusOK, 11400, "err-expert-not-found")

		// 数据 API 错误 (11500-11510)
		ErrDataApiUnavailable    = web.NewErr(http.StatusServiceUnavailable, 11500, "err-data-api-unavailable")    // 数据源未配置/不可用
		ErrDataApiStationNotFound = web.NewErr(http.StatusOK, 11501, "err-data-station-not-found")                  // 车站不存在
		ErrDataApiInsufficientCredit = web.NewErr(http.StatusPaymentRequired, 11502, "err-data-insufficient-credit") // 积分不足
		ErrDataApiInvalidParam   = web.NewErr(http.StatusOK, 11503, "err-data-invalid-param")                        // 参数错误
)

// EncodeErr 把 *web.Err 编码为 (httpStatus, businessCode, message)。
// 背景：web.Err 的 code/id/err 字段未导出，包外拿不到；而中间件（如计费）裸返回 *web.Err 时
// 会绕过 ctx.Failed 落到 echo 默认错误处理器吐 500。本函数供 HTTPErrorHandler 把已知 errcode
// 还原成标准 envelope：业务码按 errcode 身份映射，未知 *web.Err 用 httpStatus 兜底。
func EncodeErr(err error) (status, code int, msg string, ok bool) {
	var we *web.Err
	if err == nil || !errors.As(err, &we) {
		return 0, 0, "", false
	}
	status = we.Status
	msg = we.Error()
	code = status // 兜底：未知业务码用 HTTP 状态码
	switch we {
	case ErrUnauthorized:
		code = http.StatusUnauthorized
	case ErrForbidden:
		code = http.StatusForbidden
	case ErrBadRequest:
		code = http.StatusBadRequest
	case ErrDataApiUnavailable:
		code = 11500
	case ErrDataApiStationNotFound:
		code = 11501
	case ErrDataApiInsufficientCredit:
		code = 11502
	case ErrDataApiInvalidParam:
		code = 11503
	}
	if msg == "" {
		msg = http.StatusText(status)
	}
	return status, code, msg, true
}
