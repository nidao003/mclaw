/**
 * audit-middleware.ts
 *
 * mclaw 审计日志中间件（仿 QClaw qclaw_audit_log）。
 *
 * 作用：在所有 host-api 调用前后自动记录审计日志。
 * 满足国产合规要求（数据出境、内容安全、可追溯）。
 *
 * 用法（在 host-api 路由注册时包裹）：
 *   ipcMain.handle('hostapi:something', withAudit('hostapi:something', async (event, params) => {
 *     // 业务逻辑
 *     return result;
 *   }));
 *
 * 风险等级自动评估：
 *   - read: low (0)
 *   - write: mid (1)
 *   - execute: high (2)
 *   - network: mid (1)
 *   - delete: high (2)
 *
 * optPath 命名规范：
 *   hostapi:{namespace}:{action}
 *   例：hostapi:provider:save, hostapi:workspace:delete
 */

import { type IpcMainInvokeEvent } from 'electron';
import { mclawStore } from '../storage/sqlite-store';
import { logger } from '../../utils/logger';

// Action type 常量
export const ActionType = {
  READ: 0,
  WRITE: 1,
  EXECUTE: 2,
  NETWORK: 3,
  DELETE: 4,
} as const;

export const RiskLevel = {
  LOW: 0,
  MID: 1,
  HIGH: 2,
  CRITICAL: 3,
} as const;

export const AuditResult = {
  DENY: 0,
  ALLOW: 1,
  ERROR: 2,
} as const;

export interface AuditConfig {
  /** IPC channel 路径（自动从 args 取） */
  optPath: string;
  /** 风险等级，默认按路径推断 */
  riskLevel?: number;
  /** action type，默认按路径推断 */
  actionType?: number;
  /** 软 ID（pluginId、channelId 等） */
  softId?: number | null;
  /** 自定义 detail 提取器（从 params 中取关键字段，避免记录敏感数据） */
  detailExtractor?: (params: any) => string;
}

/**
 * 推断 action type 和 risk level（基于 optPath 命名约定）
 */
function inferRiskFromPath(optPath: string): { actionType: number; riskLevel: number } {
  const lower = optPath.toLowerCase();
  if (lower.includes(':delete') || lower.includes(':remove') || lower.includes('uninstall')) {
    return { actionType: ActionType.DELETE, riskLevel: RiskLevel.HIGH };
  }
  if (lower.includes(':execute') || lower.includes(':run') || lower.includes(':exec')) {
    return { actionType: ActionType.EXECUTE, riskLevel: RiskLevel.HIGH };
  }
  if (lower.includes(':write') || lower.includes(':save') || lower.includes(':set') || lower.includes(':create') || lower.includes(':update')) {
    return { actionType: ActionType.WRITE, riskLevel: RiskLevel.MID };
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('http')) {
    return { actionType: ActionType.NETWORK, riskLevel: RiskLevel.MID };
  }
  return { actionType: ActionType.READ, riskLevel: RiskLevel.LOW };
}

/**
 * 异步安全的审计日志记录（不抛错，避免审计失败拖垮主流程）
 */
function safeAudit(config: AuditConfig, params: any, result: number, error?: Error): void {
  try {
    const inferred = inferRiskFromPath(config.optPath);
    const detail = (() => {
      try {
        if (config.detailExtractor) {
          const extracted = config.detailExtractor(params);
          return typeof extracted === 'string' ? extracted : JSON.stringify(extracted);
        }
        // 默认：去掉大字段（base64、tokens、apiKeys）
        const sanitized = { ...params };
        for (const key of Object.keys(sanitized)) {
          const lower = key.toLowerCase();
          if (lower.includes('token') || lower.includes('password') || lower.includes('apikey') || lower.includes('secret')) {
            sanitized[key] = '[REDACTED]';
          } else if (typeof sanitized[key] === 'string' && sanitized[key].length > 500) {
            sanitized[key] = sanitized[key].slice(0, 500) + '...[truncated]';
          }
        }
        return JSON.stringify(sanitized);
      } catch {
        return '[serialization failed]';
      }
    })();

    mclawStore.logAudit(
      config.actionType ?? inferred.actionType,
      config.optPath,
      error ? { detail, error: error.message, stack: error.stack } : detail,
      config.riskLevel ?? inferred.riskLevel,
      result,
      config.softId ?? null,
    );
  } catch (auditErr) {
    logger.warn(`[audit-middleware] Failed to log audit for ${config.optPath}:`, auditErr);
  }
}

/**
 * 用审计中间件包装 ipcMain.handle
 *
 * 用法：
 *   ipcMain.handle('hostapi:provider:save', withAudit({
 *     optPath: 'hostapi:provider:save',
 *     detailExtractor: (p) => ({ providerId: p?.providerId }),
 *   }, async (event, params) => {
 *     // 业务逻辑
 *     return { ok: true };
 *   }));
 */
export function withAudit<TParams = any, TResult = any>(
  config: AuditConfig,
  handler: (event: IpcMainInvokeEvent, params: TParams) => Promise<TResult> | TResult,
): (event: IpcMainInvokeEvent, params: TParams) => Promise<TResult> {
  return async (event: IpcMainInvokeEvent, params: TParams) => {
    const senderId = (() => {
      try { return event.sender.id; } catch { return -1; }
    })();
    const startTime = Date.now();
    try {
      const result = await handler(event, params);
      const durationMs = Date.now() - startTime;
      // 异步审计（不阻塞主流程）
      setImmediate(() => {
        const userDetail = config.detailExtractor ? config.detailExtractor(params) : params;
        const detail = JSON.stringify({ senderId, durationMs, params: userDetail, result: 'success' });
        safeAudit(
          { ...config, detailExtractor: () => detail },
          params,
          AuditResult.ALLOW,
        );
      });
      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      setImmediate(() => {
        const userDetail = config.detailExtractor ? config.detailExtractor(params) : params;
        const detail = JSON.stringify({ senderId, durationMs, params: userDetail, result: 'error' });
        safeAudit(
          { ...config, detailExtractor: () => detail },
          params,
          AuditResult.ERROR,
          error instanceof Error ? error : new Error(String(error)),
        );
      });
      throw error;
    }
  };
}

/**
 * 手动记录审计日志（不通过 IPC handler）
 */
export function logAudit(
  optPath: string,
  actionType: number,
  detail: unknown,
  riskLevel: number = RiskLevel.LOW,
  result: number = AuditResult.ALLOW,
  softId: number | null = null,
): void {
  safeAudit(
    { optPath, actionType, riskLevel, softId, detailExtractor: () => typeof detail === 'string' ? detail : JSON.stringify(detail) },
    null,
    result,
  );
}

/**
 * 在 app 启动时初始化审计（清理过期日志 + 准备 store）
 */
export async function initAudit(): Promise<void> {
  await mclawStore.init();
  // 清理 90 天前的审计日志
  mclawStore.purgeOldAuditLogs();
  logger.info('[audit-middleware] Initialized');
}
