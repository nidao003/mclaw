/**
 * skill-usage.ts
 *
 * Skill 使用统计服务（仿 QClaw ~/.qclaw/skill-usage.json）。
 *
 * 记录每个 skill 的：
 *   - 调用次数（total / 成功 / 失败）
 *   - 首次/最后调用时间
 *   - 平均耗时
 *   - 最近一次错误信息
 *
 * 用途：
 *   - 设置页"技能使用统计"面板
 *   - 推荐常用 skill（按使用频次排序）
 *   - 检测异常 skill（错误率高、长期未用）
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { logger } from '../../utils/logger';

export interface SkillUsageRecord {
  /** skill 名（与 openclaw.skills 里的 name 一致） */
  name: string;
  /** 总调用次数 */
  totalCalls: number;
  /** 成功次数 */
  successCalls: number;
  /** 失败次数 */
  failedCalls: number;
  /** 首次调用时间（ms） */
  firstUsedAt: number;
  /** 最后调用时间（ms） */
  lastUsedAt: number;
  /** 总耗时累计（ms），用于算平均 */
  totalDurationMs: number;
  /** 最近一次错误 */
  lastError?: string;
  /** 最近一次错误时间 */
  lastErrorAt?: number;
}

export interface SkillUsageFile {
  /** schema 版本 */
  version: number;
  /** 最后更新时间 */
  updatedAt: number;
  /** 各 skill 统计（key: skillName） */
  records: Record<string, SkillUsageRecord>;
}

const FILE_NAME = 'skill-usage.json';
const SCHEMA_VERSION = 1;

class SkillUsageTracker {
  private filePath: string;
  private cache: SkillUsageFile | null = null;

  constructor() {
    this.filePath = path.join(app.getPath('userData'), FILE_NAME);
  }

  /**
   * 读整个文件（lazy + cache）
   */
  private read(): SkillUsageFile {
    if (this.cache) return this.cache;
    if (!existsSync(this.filePath)) {
      this.cache = { version: SCHEMA_VERSION, updatedAt: Date.now(), records: {} };
      return this.cache;
    }
    try {
      const raw = readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as SkillUsageFile;
      if (parsed.version !== SCHEMA_VERSION) {
        logger.warn(`[skill-usage] Schema version mismatch (${parsed.version} vs ${SCHEMA_VERSION}), migrating`);
        parsed.version = SCHEMA_VERSION;
      }
      this.cache = parsed;
      return parsed;
    } catch (err) {
      logger.warn('[skill-usage] Failed to read file, resetting:', err);
      this.cache = { version: SCHEMA_VERSION, updatedAt: Date.now(), records: {} };
      return this.cache;
    }
  }

  /**
   * 写回文件
   */
  private write(): void {
    if (!this.cache) return;
    this.cache.updatedAt = Date.now();
    try {
      const dir = path.dirname(this.filePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(this.filePath, JSON.stringify(this.cache, null, 2), 'utf-8');
    } catch (err) {
      logger.error('[skill-usage] Failed to write:', err);
    }
  }

  /**
   * 记录一次 skill 调用
   */
  recordCall(skillName: string, opts: { success: boolean; durationMs: number; error?: string }): void {
    const data = this.read();
    const now = Date.now();
    const existing = data.records[skillName];
    if (existing) {
      existing.totalCalls += 1;
      if (opts.success) existing.successCalls += 1;
      else existing.failedCalls += 1;
      existing.lastUsedAt = now;
      existing.totalDurationMs += opts.durationMs;
      if (!opts.success) {
        existing.lastError = opts.error;
        existing.lastErrorAt = now;
      }
    } else {
      data.records[skillName] = {
        name: skillName,
        totalCalls: 1,
        successCalls: opts.success ? 1 : 0,
        failedCalls: opts.success ? 0 : 1,
        firstUsedAt: now,
        lastUsedAt: now,
        totalDurationMs: opts.durationMs,
        lastError: opts.success ? undefined : opts.error,
        lastErrorAt: opts.success ? undefined : now,
      };
    }
    this.write();
  }

  /**
   * 获取所有 skill 的统计
   */
  list(): SkillUsageRecord[] {
    const data = this.read();
    return Object.values(data.records).map((r) => ({
      ...r,
      // 算平均耗时
      avgDurationMs: r.totalCalls > 0 ? Math.round(r.totalDurationMs / r.totalCalls) : 0,
      successRate: r.totalCalls > 0 ? r.successCalls / r.totalCalls : 0,
    }));
  }

  /**
   * 按使用频次排序的 Top N（推荐常用 skill 用）
   */
  topByUsage(n = 10): SkillUsageRecord[] {
    return this.list()
      .sort((a, b) => b.totalCalls - a.totalCalls)
      .slice(0, n);
  }

  /**
   * 找出错误率最高的 skill（异常检测）
   */
  topByErrorRate(minCalls = 5, n = 10): SkillUsageRecord[] {
    return this.list()
      .filter((r) => r.totalCalls >= minCalls && r.failedCalls > 0)
      .sort((a, b) => (b.failedCalls / b.totalCalls) - (a.failedCalls / a.totalCalls))
      .slice(0, n);
  }

  /**
   * 长期未用的 skill（> 30 天没调过）
   */
  staleSkills(staleDays = 30): SkillUsageRecord[] {
    const cutoff = Date.now() - staleDays * 24 * 60 * 60 * 1000;
    return this.list().filter((r) => r.lastUsedAt < cutoff);
  }

  /**
   * 清除某个 skill 的统计
   */
  reset(skillName: string): void {
    const data = this.read();
    delete data.records[skillName];
    this.write();
  }

  /**
   * 清除所有统计
   */
  resetAll(): void {
    this.cache = { version: SCHEMA_VERSION, updatedAt: Date.now(), records: {} };
    this.write();
  }

  /**
   * 摘要（设置页用）
   */
  summary(): { totalSkills: number; totalCalls: number; totalErrors: number } {
    const records = this.list();
    return {
      totalSkills: records.length,
      totalCalls: records.reduce((sum, r) => sum + r.totalCalls, 0),
      totalErrors: records.reduce((sum, r) => sum + r.failedCalls, 0),
    };
  }
}

// 单例
export const skillUsage = new SkillUsageTracker();
