/**
 * bootstrap.ts
 *
 * mclaw 启动时统一初始化所有 QClaw 模式服务（仿 QClaw 完整生命周期）。
 *
 * 目标：让 `~/.mclaw` 启动后长出所有 QClaw 风格的目录和文件，避免出现"刚升级完，
 *       但 ~/.mclaw 还是老样子"的尴尬。
 *
 * 在 app.whenReady() 里调一次 await bootstrapMclawServices()，所有副作用按顺序执行：
 *
 *   1. 标记安装时间 + 清理标记
 *   2. mawruntime 解包（packaged 模式；dev 模式 noop）
 *   3. SQLite 初始化（K-V 表 + 审计表）
 *   4. 自动备份：检测 openclaw.json 损坏 → 自动恢复 → 启动定时备份
 *   5. Skill 使用统计初始化
 *   6. 多 workspace 初始化（创建默认 workspace + workspaces.json）
 *   7. 扩展加载器初始化
 *   8. 翻译缓存初始化
 *   9. 反馈打包脚本可用性检查
 *
 * 每个服务都用 try-catch 包裹，单独失败不影响其他服务启动。
 *
 * 用法：
 *   import { bootstrapMclawServices } from './bootstrap';
 *   app.whenReady().then(async () => {
 *     await bootstrapMclawServices({ runtimeDir, version });
 *     // 继续其他初始化...
 *   });
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { logger } from '../utils/logger';
import { closeMclawStore } from '../services/storage/sqlite-store';
import { initAudit, logAudit, RiskLevel, ActionType, AuditResult } from '../services/audit/audit-middleware';
import { autoBackup } from '../services/backup/auto-backup';
import { skillUsage } from '../services/usage/skill-usage';
import { workspaceManager } from '../services/workspace/workspace-manager';
import { initMclawExtensionLoader } from '../services/extensions/extension-loader';
import { getMclawRuntimeDir, ensureMclawRuntimeExtracted } from '../utils/paths';

const MCLAW_DIR = join(homedir(), '.mclaw');

export interface BootstrapOptions {
  /** mclaw 版本（从 package.json 读） */
  version: string;
  /** 是否为 packaged 模式（影响 mawruntime 解包） */
  isPackaged: boolean;
}

export interface BootstrapResult {
  /** 总耗时 ms */
  elapsedMs: number;
  /** 每个服务的初始化结果 */
  services: Record<string, { ok: boolean; reason?: string; elapsedMs: number }>;
}

/**
 * 写入 QClaw 风格的标记文件
 *
 * QClaw 有：
 *   - ~/.qclaw/.installed             安装时间戳
 *   - ~/.qclaw/.stale-skills-cleaned  上次清理时间
 *   - ~/.qclaw/.auto-memory/         自动记忆
 */
function writeQclawStyleFlags(version: string): { ok: boolean; reason?: string } {
  try {
    if (!existsSync(MCLAW_DIR)) mkdirSync(MCLAW_DIR, { recursive: true });

    // .installed
    const installedFile = join(MCLAW_DIR, '.installed');
    let isNewInstall = false;
    if (!existsSync(installedFile)) {
      isNewInstall = true;
    }
    const installedData = {
      version,
      installedAt: isNewInstall ? new Date().toISOString() : (() => {
        try { return readFileSync(installedFile, 'utf-8'); } catch { return 'unknown'; }
      })(),
      lastBootedAt: new Date().toISOString(),
    };
    writeFileSync(installedFile, JSON.stringify(installedData, null, 2), 'utf-8');

    // .stale-skills-cleaned
    const staleFile = join(MCLAW_DIR, '.stale-skills-cleaned');
    if (!existsSync(staleFile)) {
      writeFileSync(staleFile, new Date().toISOString(), 'utf-8');
    }

    // .auto-memory 目录
    const autoMemoryDir = join(MCLAW_DIR, '.auto-memory');
    if (!existsSync(autoMemoryDir)) mkdirSync(autoMemoryDir, { recursive: true });

    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * 1. 写入 QClaw 风格标记
 * 2. mawruntime 解包
 * 3. SQLite 初始化
 * 4. 自动备份启动
 * 5. Skill 统计初始化
 * 6. workspace 初始化
 * 7. 扩展加载
 * 8. 翻译缓存
 * 9. 反馈打包
 */
export async function bootstrapMclawServices(opts: BootstrapOptions): Promise<BootstrapResult> {
  const totalStart = Date.now();
  const result: BootstrapResult = {
    elapsedMs: 0,
    services: {},
  };

  // 1. QClaw 风格标记文件
  const flagsStart = Date.now();
  const flagsResult = writeQclawStyleFlags(opts.version);
  result.services['flags'] = { ...flagsResult, elapsedMs: Date.now() - flagsStart };

  // 2. mawruntime 解包（packaged 模式才需要；dev 模式 noop）
  const extractStart = Date.now();
  try {
    const extractResult = await ensureMclawRuntimeExtracted();
    result.services['mawruntime-extract'] = {
      ok: extractResult.ok,
      reason: extractResult.reason,
      elapsedMs: Date.now() - extractStart,
    };
  } catch (err) {
    result.services['mawruntime-extract'] = {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - extractStart,
    };
  }

  // 3. SQLite 初始化 + 审计
  const auditStart = Date.now();
  try {
    await initAudit();
    result.services['sqlite-audit'] = { ok: true, elapsedMs: Date.now() - auditStart };
    // 记录一次启动审计
    logAudit(
      'app:startup', ActionType.READ, {
        version: opts.version,
        platform: process.platform,
        arch: process.arch,
        isPackaged: opts.isPackaged,
        nodeVersion: process.versions.node,
        electronVersion: process.versions.electron || 'unknown',
      },
      RiskLevel.LOW,
      AuditResult.ALLOW,
    );
  } catch (err) {
    result.services['sqlite-audit'] = {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - auditStart,
    };
  }

  // 4. 自动备份：先检测损坏 → 再启动定时
  const backupStart = Date.now();
  try {
    const restoreResult = autoBackup.restoreIfCorrupted();
    if (restoreResult.restored) {
      logger.warn(`[bootstrap] Restored corrupted openclaw.json from ${restoreResult.backupPath}`);
      logAudit('backup:restore', ActionType.WRITE, {
        backupPath: restoreResult.backupPath,
        reason: restoreResult.reason,
      }, RiskLevel.HIGH, AuditResult.ALLOW);
    }
    autoBackup.start();
    result.services['auto-backup'] = { ok: true, elapsedMs: Date.now() - backupStart };
  } catch (err) {
    result.services['auto-backup'] = {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - backupStart,
    };
  }

  // 5. Skill 使用统计
  const skillStart = Date.now();
  try {
    // skill-usage.json 会在 recordCall 时懒创建，但我们要确保 summary() 能跑
    const summary = skillUsage.summary();
    logger.info(`[bootstrap] Skill usage tracker ready: ${summary.totalSkills} skills tracked, ${summary.totalCalls} total calls`);
    result.services['skill-usage'] = { ok: true, elapsedMs: Date.now() - skillStart };
  } catch (err) {
    result.services['skill-usage'] = {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - skillStart,
    };
  }

  // 6. 多 workspace 初始化
  const wsStart = Date.now();
  try {
    const list = workspaceManager.list();
    const activeWs = workspaceManager.activate('default') || list[0];
    logger.info(`[bootstrap] Workspace ready: ${activeWs.name} (${list.length} total)`);
    result.services['workspace'] = {
      ok: true,
      elapsedMs: Date.now() - wsStart,
    };
  } catch (err) {
    result.services['workspace'] = {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - wsStart,
    };
  }

  // 7. 扩展加载器（packaged 模式从解包目录扫描，dev 模式从 node_modules 扫描）
  const extStart = Date.now();
  try {
    const runtimeDir = getMclawRuntimeDir();
    const loader = initMclawExtensionLoader(runtimeDir);
    const loaded = loader.loadAll();
    logger.info(`[bootstrap] Extension loader ready: ${loaded.length} extensions (${loaded.filter(e => e.builtin).length} builtin)`);
    result.services['extension-loader'] = {
      ok: true,
      elapsedMs: Date.now() - extStart,
    };
  } catch (err) {
    result.services['extension-loader'] = {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - extStart,
    };
  }

  // 8. 翻译缓存（纯内存懒加载，no-op）
  const i18nStart = Date.now();
  result.services['translation-cache'] = { ok: true, elapsedMs: Date.now() - i18nStart };

  // 9. 反馈打包脚本可用性
  const feedbackStart = Date.now();
  try {
    // pack-mclaw.cjs 是 CommonJS，用 require 加载
    const packModule = require('../../scripts/pack-mclaw.cjs') as { packMclaw?: () => Promise<unknown> };
    if (typeof packModule.packMclaw === 'function') {
      result.services['feedback-pack'] = { ok: true, elapsedMs: Date.now() - feedbackStart };
    } else {
      result.services['feedback-pack'] = { ok: false, reason: 'packMclaw not exported', elapsedMs: Date.now() - feedbackStart };
    }
  } catch (err) {
    result.services['feedback-pack'] = {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - feedbackStart,
    };
  }

  result.elapsedMs = Date.now() - totalStart;
  logger.info(`[bootstrap] All services initialized in ${result.elapsedMs}ms`);

  // 总结
  const failed = Object.entries(result.services).filter(([, r]) => !r.ok);
  if (failed.length > 0) {
    logger.warn(`[bootstrap] ${failed.length} service(s) failed:`,
      failed.map(([name, r]) => `${name}: ${r.reason}`).join('; '));
  }

  return result;
}

/**
 * app quit 时统一关闭所有服务
 */
export async function shutdownMclawServices(): Promise<void> {
  logger.info('[bootstrap] Shutting down mclaw services...');
  try {
    autoBackup.stop();
    closeMclawStore();
    // 记录 shutdown 审计
    logAudit('app:shutdown', ActionType.READ, {
      pid: process.pid,
      uptimeMs: Math.floor(process.uptime() * 1000),
    }, RiskLevel.LOW, AuditResult.ALLOW);
  } catch (err) {
    logger.warn('[bootstrap] Error during shutdown:', err);
  }
}
