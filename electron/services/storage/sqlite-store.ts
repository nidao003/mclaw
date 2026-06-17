/**
 * sqlite-store.ts
 *
 * mclaw SQLite 存储层（替代 electron-store 的 JSON 存储）。
 *
 * 仿 QClaw 的 qclaw.db 模式：
 *   - 一个 SQLite 文件 + WAL
 *   - K-V 表（mclaw_config）
 *   - 审计日志表（mclaw_audit_log）
 *
 * 收益：
 *   - 写入性能：事务 + WAL，比 JSON 文件快几十倍
 *   - 并发安全：多读单写
 *   - 自动备份：cp 一个文件即可
 *   - 国产合规：审计日志天然存在
 *
 * 依赖：Node 22+ 内置 node:sqlite（Electron 40 用的 Node 22.16）
 * 平台：所有平台都支持
 */
import { app } from 'electron';
import path from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { logger } from '../../utils/logger';

const SCHEMA_VERSION = 1;
const SCHEMA_VERSION_KEY = '_schema_version';

export type ConfigValueType = 'string' | 'number' | 'boolean' | 'json';

export interface ConfigRow {
  key: string;
  value: string;
  valueType: ConfigValueType;
  description: string;
  updatedAt: number;
  createdAt: number;
}

export interface AuditLogRow {
  id?: number;
  /** 软 ID（如 pluginId、channelId） */
  softId: number | null;
  /** 操作类型（0=read, 1=write, 2=execute, 3=network, 4=delete） */
  actionType: number;
  /** 详细信息（JSON 字符串） */
  detail: string;
  /** 风险等级（0=low, 1=mid, 2=high, 3=critical） */
  riskLevel: number;
  /** 结果（0=deny, 1=allow, 2=error） */
  result: number;
  /** 操作路径（哪个 host-api / IPC channel） */
  optPath: string;
  /** Unix timestamp ms */
  createdAt: number;
}

// node:sqlite 在 Node 22.5+ 实验性启用
// Electron 40 内置 Node 22.16，稳定支持
let DatabaseSync: any = null;
try {
  const sqlite = require('node:sqlite') as typeof import('node:sqlite');
  DatabaseSync = sqlite.DatabaseSync;
} catch (err) {
  logger.warn('[sqlite-store] node:sqlite not available, falling back to JSON store:', err);
}

/**
 * 单例 SQLite store
 */
class MclawSqliteStore {
  private db: any = null;
  private dbPath: string | null = null;
  private fallbackPath: string | null = null;
  private ready = false;
  private initPromise: Promise<boolean> | null = null;

  /**
   * 初始化（lazy），多次调用安全
   */
  async init(): Promise<boolean> {
    if (this.ready) return true;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._doInit();
    return this.initPromise;
  }

  private async _doInit(): Promise<boolean> {
    const userData = app.getPath('userData');
    if (!existsSync(userData)) {
      mkdirSync(userData, { recursive: true });
    }
    this.dbPath = path.join(userData, 'mclaw.db');
    this.fallbackPath = path.join(userData, 'mclaw-fallback.json');

    if (!DatabaseSync) {
      logger.warn('[sqlite-store] No node:sqlite, using JSON fallback');
      this._initJsonFallback();
      this.ready = true;
      return true;
    }

    try {
      this.db = new DatabaseSync(this.dbPath);
      this.db.exec('PRAGMA journal_mode = WAL');
      this.db.exec('PRAGMA synchronous = NORMAL');
      this.db.exec('PRAGMA foreign_keys = ON');
      this._migrate();
      this.ready = true;
      logger.info(`[sqlite-store] Opened ${this.dbPath} (WAL mode)`);
      return true;
    } catch (err) {
      logger.error('[sqlite-store] Failed to open SQLite, falling back to JSON:', err);
      this._initJsonFallback();
      this.ready = true;
      return true;
    }
  }

  private _initJsonFallback() {
    if (!this.fallbackPath) return;
    if (!existsSync(this.fallbackPath)) {
      writeFileSync(this.fallbackPath, JSON.stringify({ configs: {}, auditLog: [] }, null, 2), 'utf-8');
    }
  }

  private _migrate() {
    if (!this.db) return;

    // mclaw_config: K-V 配置表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS mclaw_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        value_type TEXT NOT NULL DEFAULT 'string',
        description TEXT NOT NULL DEFAULT '',
        updated_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_mclaw_config_key ON mclaw_config(key);
    `);

    // mclaw_audit_log: 审计日志
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS mclaw_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        softid INTEGER,
        actiontype INTEGER NOT NULL,
        detail TEXT NOT NULL,
        risklevel INTEGER NOT NULL,
        result INTEGER NOT NULL,
        optpath TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_mclaw_audit_log_actiontype ON mclaw_audit_log(actiontype);
      CREATE INDEX IF NOT EXISTS idx_mclaw_audit_log_created_at ON mclaw_audit_log(created_at);
      CREATE INDEX IF NOT EXISTS idx_mclaw_audit_log_risklevel ON mclaw_audit_log(risklevel);
    `);

    // 记录 schema 版本
    // 注意：不能调 this.set()（会触发 _ensureReady → init → _migrate 死循环）
    // 直接用底层 db.prepare() 写
    if (this.db) {
      this.db.prepare(`
        INSERT INTO mclaw_config (key, value, value_type, description, updated_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          value_type = excluded.value_type,
          description = excluded.description,
          updated_at = excluded.updated_at
      `).run(
        SCHEMA_VERSION_KEY,
        String(SCHEMA_VERSION),
        'number',
        'sqlite store schema version',
        Date.now(),
        Date.now(),
      );
    }
  }

  // ───────────────── K-V API ─────────────────

  /**
   * 设置一个配置项
   */
  set(
    key: string,
    value: string | number | boolean | object,
    valueType: ConfigValueType = 'string',
    description = '',
  ): void {
    this._ensureReady();
    if (!this.db) return this._jsonSet(key, value, valueType);

    const serialized = this._serialize(value, valueType);
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO mclaw_config (key, value, value_type, description, updated_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        value_type = excluded.value_type,
        description = CASE WHEN excluded.description = '' THEN mclaw_config.description ELSE excluded.description END,
        updated_at = excluded.updated_at
    `).run(key, serialized, valueType, description, now, now);
  }

  /**
   * 读取一个配置项
   */
  get<T = unknown>(key: string, defaultValue?: T): T | undefined {
    this._ensureReady();
    if (!this.db) return this._jsonGet(key, defaultValue);

    try {
      const row = this.db.prepare('SELECT * FROM mclaw_config WHERE key = ?').get(key) as ConfigRow | undefined;
      if (!row) return defaultValue;
      return this._deserialize(row.value, row.valueType) as T;
    } catch (err) {
      logger.warn(`[sqlite-store] get(${key}) failed:`, err);
      return defaultValue;
    }
  }

  /**
   * 删除一个配置项
   */
  delete(key: string): boolean {
    this._ensureReady();
    if (!this.db) return this._jsonDelete(key);
    const result = this.db.prepare('DELETE FROM mclaw_config WHERE key = ?').run(key);
    return result.changes > 0;
  }

  /**
   * 列出所有配置项
   */
  list(prefix?: string): ConfigRow[] {
    this._ensureReady();
    if (!this.db) return this._jsonList(prefix);

    if (prefix) {
      return this.db.prepare('SELECT * FROM mclaw_config WHERE key LIKE ? ORDER BY key').all(`${prefix}%`) as ConfigRow[];
    }
    return this.db.prepare('SELECT * FROM mclaw_config ORDER BY key').all() as ConfigRow[];
  }

  // ───────────────── 审计日志 API ─────────────────

  /**
   * 记录一条审计日志
   *
   * @param actionType 0=read, 1=write, 2=execute, 3=network, 4=delete
   * @param riskLevel 0=low, 1=mid, 2=high, 3=critical
   * @param result 0=deny, 1=allow, 2=error
   */
  logAudit(
    actionType: number,
    optPath: string,
    detail: unknown,
    riskLevel: number = 0,
    result: number = 1,
    softId: number | null = null,
  ): void {
    this._ensureReady();
    const detailStr = typeof detail === 'string' ? detail : JSON.stringify(detail);
    if (!this.db) return this._jsonLogAudit(actionType, optPath, detailStr, riskLevel, result, softId);

    try {
      this.db.prepare(`
        INSERT INTO mclaw_audit_log (softid, actiontype, detail, risklevel, result, optpath, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(softId, actionType, detailStr, riskLevel, result, optPath, Date.now());
    } catch (err) {
      logger.warn(`[sqlite-store] logAudit failed:`, err);
    }
  }

  /**
   * 查询审计日志
   */
  queryAudit(opts: {
    actionType?: number;
    riskLevel?: number;
    sinceMs?: number;
    limit?: number;
  } = {}): AuditLogRow[] {
    this._ensureReady();
    if (!this.db) return this._jsonQueryAudit(opts);

    const conditions: string[] = [];
    const params: any[] = [];
    if (opts.actionType !== undefined) {
      conditions.push('actiontype = ?');
      params.push(opts.actionType);
    }
    if (opts.riskLevel !== undefined) {
      conditions.push('risklevel = ?');
      params.push(opts.riskLevel);
    }
    if (opts.sinceMs !== undefined) {
      conditions.push('created_at >= ?');
      params.push(opts.sinceMs);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = opts.limit ?? 1000;
    return this.db.prepare(`SELECT * FROM mclaw_audit_log ${where} ORDER BY created_at DESC LIMIT ?`).all(...params, limit) as AuditLogRow[];
  }

  /**
   * 清理过期审计日志（保留 90 天）
   */
  purgeOldAuditLogs(retentionMs = 90 * 24 * 60 * 60 * 1000): number {
    this._ensureReady();
    if (!this.db) return 0;
    const cutoff = Date.now() - retentionMs;
    const result = this.db.prepare('DELETE FROM mclaw_audit_log WHERE created_at < ?').run(cutoff);
    if (result.changes > 0) {
      logger.info(`[sqlite-store] Purged ${result.changes} audit log entries older than ${retentionMs}ms`);
    }
    return result.changes;
  }

  /**
   * 关闭连接
   */
  close(): void {
    if (this.db) {
      try {
        this.db.close();
        logger.info('[sqlite-store] Closed database connection');
      } catch (err) {
        logger.warn('[sqlite-store] close() failed:', err);
      }
    }
    this.db = null;
    this.ready = false;
  }

  // ───────────────── 内部辅助 ─────────────────

  private _ensureReady() {
    if (!this.ready) {
      // 同步 init（fire-and-forget），不能 await 在这里因为是同步 API
      void this.init();
    }
  }

  private _serialize(value: unknown, type: ConfigValueType): string {
    if (type === 'json' || (typeof value === 'object' && value !== null)) {
      return JSON.stringify(value);
    }
    return String(value);
  }

  private _deserialize(value: string, type: ConfigValueType): unknown {
    switch (type) {
      case 'number': return Number(value);
      case 'boolean': return value === 'true' || value === '1';
      case 'json': {
        try { return JSON.parse(value); } catch { return value; }
      }
      default: return value;
    }
  }

  // ───────────────── JSON fallback ─────────────────
  // 当 node:sqlite 不可用时降级到 JSON（不推荐生产用，但能跑）
  private _jsonRead() {
    if (!this.fallbackPath || !existsSync(this.fallbackPath)) {
      return { configs: {}, auditLog: [] };
    }
    try { return JSON.parse(readFileSync(this.fallbackPath, 'utf-8')); }
    catch { return { configs: {}, auditLog: [] }; }
  }

  private _jsonWrite(data: any) {
    if (!this.fallbackPath) return;
    try { writeFileSync(this.fallbackPath, JSON.stringify(data, null, 2), 'utf-8'); }
    catch (err) { logger.warn('[sqlite-store] JSON fallback write failed:', err); }
  }

  private _jsonSet(key: string, value: unknown, type: ConfigValueType) {
    const data = this._jsonRead();
    data.configs[key] = { value: this._serialize(value, type), valueType: type, updatedAt: Date.now() };
    this._jsonWrite(data);
  }

  private _jsonGet(key: string, defaultValue?: any) {
    const data = this._jsonRead();
    const row = data.configs[key];
    if (!row) return defaultValue;
    return this._deserialize(row.value, row.valueType);
  }

  private _jsonDelete(key: string) {
    const data = this._jsonRead();
    if (key in data.configs) {
      delete data.configs[key];
      this._jsonWrite(data);
      return true;
    }
    return false;
  }

  private _jsonList(prefix?: string): ConfigRow[] {
    const data = this._jsonRead();
    const rows: ConfigRow[] = [];
    for (const [key, row] of Object.entries(data.configs as Record<string, any>)) {
      if (prefix && !key.startsWith(prefix)) continue;
      rows.push({
        key,
        value: row.value,
        valueType: row.valueType,
        description: '',
        updatedAt: row.updatedAt,
        createdAt: row.updatedAt,
      });
    }
    return rows;
  }

  private _jsonLogAudit(actionType: number, optPath: string, detail: string, riskLevel: number, result: number, softId: number | null) {
    const data = this._jsonRead();
    data.auditLog.push({
      id: data.auditLog.length + 1,
      softId, actionType, detail, riskLevel, result, optPath,
      createdAt: Date.now(),
    });
    if (data.auditLog.length > 10000) data.auditLog.shift(); // 简单限流
    this._jsonWrite(data);
  }

  private _jsonQueryAudit(opts: any): AuditLogRow[] {
    const data = this._jsonRead();
    let rows = data.auditLog as AuditLogRow[];
    if (opts.actionType !== undefined) rows = rows.filter(r => r.actionType === opts.actionType);
    if (opts.riskLevel !== undefined) rows = rows.filter(r => r.riskLevel === opts.riskLevel);
    if (opts.sinceMs !== undefined) rows = rows.filter(r => (r.createdAt || 0) >= opts.sinceMs);
    return rows.slice(-(opts.limit ?? 1000)).reverse();
  }
}

// 单例
export const mclawStore = new MclawSqliteStore();

/**
 * 关闭所有 store（app quit 时调用）
 */
export function closeMclawStore(): void {
  mclawStore.close();
}
