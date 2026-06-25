package subscription

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/samber/do"
	"go.uber.org/zap"

	"github.com/nidao003/mclaw/backend/consts"
	"github.com/nidao003/mclaw/backend/domain"
)

// lastGrantMonth 记录本月已发放过的月份（进程内去重，避免 1 号 0:00-1:00 窗口内重复发放）。
// 进程重启会丢失，最坏情况是重启落在该窗口时本月多发一次，可接受。
var lastGrantMonth sync.Map

// StartBackgroundJobs 启动订阅相关的后台定时任务：
//  1. 每小时清理过期订阅（ExpireOverdueSubscriptions，补齐原本的死代码）
//  2. 每月 1 号 0:00-1:00 给所有活跃订阅发放 monthly_credits
func StartBackgroundJobs(i *do.Injector) {
	logger, err := do.Invoke[*zap.Logger](i)
	if err != nil || logger == nil {
		return
	}
	subUC, err := do.Invoke[domain.SubscriptionUsecase](i)
	if err != nil || subUC == nil {
		logger.Warn("subscription usecase unavailable, background jobs not started", zap.Error(err))
		return
	}

	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		// 启动后先跑一次（清理启动期间过期的订阅）
		runBackgroundCycle(context.Background(), i, subUC, logger)
		for range ticker.C {
			runBackgroundCycle(context.Background(), i, subUC, logger)
		}
	}()

	logger.Info("subscription background jobs started (hourly expire + monthly credit grant)")
}

func runBackgroundCycle(ctx context.Context, i *do.Injector, subUC domain.SubscriptionUsecase, logger *zap.Logger) {
	// 1. 过期订阅清理
	if n, err := subUC.ExpireOverdueSubscriptions(ctx); err != nil {
		logger.Warn("expire overdue subscriptions failed", zap.Error(err))
	} else if n > 0 {
		logger.Info("expired overdue subscriptions", zap.Int("count", n))
	}

	// 2. 月度积分发放（每月 1 号 0:00-1:00 命中一次）
	now := time.Now()
	if now.Day() == 1 && now.Hour() == 0 {
		grantMonthlyCreditsToAll(ctx, i, logger, now)
	}
}

// grantMonthlyCreditsToAll 给所有活跃订阅用户发放其 plan 的 monthly_credits。
func grantMonthlyCreditsToAll(ctx context.Context, i *do.Injector, logger *zap.Logger, now time.Time) {
	monthKey := now.Format("2006-01")
	if _, loaded := lastGrantMonth.LoadOrStore(monthKey, struct{}{}); loaded {
		return // 本月已发放
	}

	subRepo, err := do.Invoke[domain.SubscriptionRepo](i)
	if err != nil || subRepo == nil {
		logger.Warn("subscription repo unavailable, skip monthly credit grant", zap.Error(err))
		return
	}
	walletUC, err := do.Invoke[domain.WalletUsecase](i)
	if err != nil || walletUC == nil {
		logger.Warn("wallet usecase unavailable, skip monthly credit grant", zap.Error(err))
		return
	}

	subs, err := subRepo.ListActiveSubscriptions(ctx)
	if err != nil {
		logger.Warn("list active subscriptions failed, skip monthly credit grant", zap.Error(err))
		return
	}

	granted := 0
	for _, sub := range subs {
		plan := sub.Edges.Plan
		if plan == nil || plan.MonthlyCredits <= 0 {
			continue
		}
		remark := fmt.Sprintf("月度赠送积分: %s", plan.Name)
		if grantErr := walletUC.Grant(ctx, sub.UserID, consts.TransactionSubscriptionGrant, plan.MonthlyCredits, remark, ""); grantErr != nil {
			logger.Warn("grant monthly credits failed",
				zap.Error(grantErr), zap.String("user_id", sub.UserID.String()))
			continue
		}
		granted++
	}
	logger.Info("monthly credit grant completed", zap.Int("users", granted), zap.String("month", monthKey))
}
