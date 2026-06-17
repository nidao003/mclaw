/**
 * auto-backup.ts
 *
 * mclaw 自动备份服务（仿 QClaw ~/.qclaw/backups/）。
 *
 * 备份策略：
 *   - 每次启动时 + 每 6 小时做一次快照
 *   - 备份内容：openclaw.json + 全部 workspace + auth-profiles + devices/
 *   - 保留策略：最近 7 天 + 最近 4 周 + 最近 6 月（按时间分桶）
 *   - 损坏时启动恢复：检测 openclaw.json 损坏自动从最近备份恢复
 *
 * 备份位置：~/.mclaw/backups/YYYY-MM-DD/HH-mm-ss/
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync, copyFileSync, cpSync, renameSync } from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import { logger } from '../../utils/logger';

const BACKUP_ROOT = 'backups';
const BACKUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 小时
const RETENTION_DAYS_RECENT = 7;     // 最近 7 天每天一备份
const RETENTION_WEEKS = 4;            // 每周一备份保留 4 周
const RETENTION_MONTHS = 6;           // 每月一备份保留 6 月

/**
 * 备份条目元数据
 */
export interface BackupEntry {
  /** 唯一 ID（时间戳） */
  id: string;
  /** 绝对路径 */
  path: string;
  /** 创建时间 */
  createdAt: number;
  /** 大小（bytes） */
  size: number;
  /** 备份类型：auto / manual / pre-upgrade */
  kind: 'auto' | 'manual' | 'pre-upgrade';
  /** 备份时的 mclaw 版本 */
  mclawVersion: string;
  /** 备份时的 openclaw 版本 */
  openclawVersion: string;
}

class AutoBackupService {
  private mclawDir: string;
  private backupRoot: string;
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.mclawDir = path.join(homedir(), '.mclaw');
    this.backupRoot = path.join(this.mclawDir, BACKUP_ROOT);
  }

  /**
   * 启动后台定时备份
   */
  start(): void {
    if (this.timer) return;
    // 启动时做一次
    setImmediate(() => {
      void this.backup('auto').catch((err) => {
        logger.warn('[auto-backup] Initial backup failed:', err);
      });
    });
    // 之后每 6 小时一次
    this.timer = setInterval(() => {
      void this.backup('auto').catch((err) => {
        logger.warn('[auto-backup] Periodic backup failed:', err);
      });
    }, BACKUP_INTERVAL_MS);
    logger.info(`[auto-backup] Started (interval: ${BACKUP_INTERVAL_MS}ms)`);
  }

  /**
   * 停止后台备份
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * 执行一次备份
   */
  async backup(kind: 'auto' | 'manual' | 'pre-upgrade' = 'auto'): Promise<BackupEntry> {
    if (!existsSync(this.mclawDir)) {
      throw new Error(`mclaw config dir not found: ${this.mclawDir}`);
    }

    const now = Date.now();
    const dateStr = new Date(now).toISOString().slice(0, 10);
    const timeStr = new Date(now).toISOString().slice(11, 19).replace(/:/g, '-');
    const backupDir = path.join(this.backupRoot, dateStr, `${timeStr}-${kind}`);
    mkdirSync(backupDir, { recursive: true });

    // 备份关键文件
    const itemsToBackup: Array<{ src: string; dest: string; isDir: boolean }> = [];

    // 1) openclaw.json（主配置）
    const openclawJson = path.join(this.mclawDir, 'openclaw.json');
    if (existsSync(openclawJson)) {
      itemsToBackup.push({ src: openclawJson, dest: path.join(backupDir, 'openclaw.json'), isDir: false });
    }
    // 1b) openclaw.json.last-good
    const lastGood = path.join(this.mclawDir, 'openclaw.json.last-good');
    if (existsSync(lastGood)) {
      itemsToBackup.push({ src: lastGood, dest: path.join(backupDir, 'openclaw.json.last-good'), isDir: false });
    }

    // 2) agents 目录（auth-profiles、models 等）
    const agentsDir = path.join(this.mclawDir, 'agents');
    if (existsSync(agentsDir)) {
      itemsToBackup.push({ src: agentsDir, dest: path.join(backupDir, 'agents'), isDir: true });
    }

    // 3) devices（配对设备）
    const devicesDir = path.join(this.mclawDir, 'devices');
    if (existsSync(devicesDir)) {
      itemsToBackup.push({ src: devicesDir, dest: path.join(backupDir, 'devices'), isDir: true });
    }

    // 4) workspaces.json
    const workspacesFile = path.join(this.mclawDir, 'workspaces.json');
    if (existsSync(workspacesFile)) {
      itemsToBackup.push({ src: workspacesFile, dest: path.join(backupDir, 'workspaces.json'), isDir: false });
    }

    // 5) workspace 目录（默认 + 副 workspace）
    const mainWs = path.join(this.mclawDir, 'workspace');
    if (existsSync(mainWs)) {
      itemsToBackup.push({ src: mainWs, dest: path.join(backupDir, 'workspace'), isDir: true });
    }
    // 副 workspace: workspace-*
    try {
      for (const entry of readdirSync(this.mclawDir)) {
        if (entry.startsWith('workspace-') && entry !== 'workspaces.json') {
          const wsDir = path.join(this.mclawDir, entry);
          if (statSync(wsDir).isDirectory()) {
            itemsToBackup.push({ src: wsDir, dest: path.join(backupDir, entry), isDir: true });
          }
        }
      }
    } catch (err) {
      logger.warn('[auto-backup] Failed to scan workspace-*:', err);
    }

    // 6) mclaw.json 指针文件
    const mclawJson = path.join(this.mclawDir, 'mclaw.json');
    if (existsSync(mclawJson)) {
      itemsToBackup.push({ src: mclawJson, dest: path.join(backupDir, 'mclaw.json'), isDir: false });
    }

    // 执行备份
    let totalSize = 0;
    for (const item of itemsToBackup) {
      try {
        if (item.isDir) {
          cpSync(item.src, item.dest, { recursive: true, dereference: true });
        } else {
          copyFileSync(item.src, item.dest);
        }
        try {
          const stat = statSync(item.dest);
          totalSize += stat.size;
        } catch { /* ignore */ }
      } catch (err) {
        logger.warn(`[auto-backup] Failed to backup ${item.src}:`, err);
      }
    }

    // 写元数据
    const pkg = require(path.join(this.mclawDir, '..', 'package.json')) as any;
    const openclawPkgPath = path.join(this.mclawDir, 'openclaw', 'node_modules', 'openclaw', 'package.json');
    let openclawVersion = 'unknown';
    try {
      if (existsSync(openclawPkgPath)) {
        openclawVersion = JSON.parse(readFileSync(openclawPkgPath, 'utf-8')).version || 'unknown';
      }
    } catch { /* ignore */ }
    const meta: BackupEntry = {
      id: `${dateStr}_${timeStr}_${kind}`,
      path: backupDir,
      createdAt: now,
      size: totalSize,
      kind,
      mclawVersion: pkg?.version ?? 'unknown',
      openclawVersion,
    };
    writeFileSync(path.join(backupDir, '.backup-meta.json'), JSON.stringify(meta, null, 2), 'utf-8');

    logger.info(`[auto-backup] ${kind} backup created: ${backupDir} (${this._formatSize(totalSize)})`);

    // 清理过期备份
    this._purgeOldBackups();

    return meta;
  }

  /**
   * 启动时检测并恢复损坏的配置
   */
  restoreIfCorrupted(): { restored: boolean; backupPath?: string; reason?: string } {
    const openclawJson = path.join(this.mclawDir, 'openclaw.json');
    if (!existsSync(openclawJson)) {
      return { restored: false, reason: 'openclaw.json does not exist (first run?)' };
    }

    // 检测损坏：JSON 解析失败
    try {
      const raw = readFileSync(openclawJson, 'utf-8');
      JSON.parse(raw);
      return { restored: false }; // 正常，不恢复
    } catch (err) {
      logger.warn(`[auto-backup] Detected corrupted openclaw.json:`, err);
    }

    // 找最近的备份
    const latest = this._findLatestBackup();
    if (!latest) {
      return { restored: false, reason: 'no backup available to restore from' };
    }

    // 恢复
    const backupOpenclaw = path.join(latest, 'openclaw.json');
    if (!existsSync(backupOpenclaw)) {
      return { restored: false, reason: 'latest backup missing openclaw.json' };
    }

    try {
      const corrupted = path.join(this.mclawDir, 'openclaw.json.corrupted-' + Date.now());
      renameSync(openclawJson, corrupted);
      copyFileSync(backupOpenclaw, openclawJson);
      logger.info(`[auto-backup] Restored openclaw.json from ${latest} (corrupted saved to ${corrupted})`);
      return { restored: true, backupPath: latest };
    } catch (err) {
      logger.error(`[auto-backup] Restore failed:`, err);
      return { restored: false, reason: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * 列出所有备份（按时间倒序）
   */
  list(): BackupEntry[] {
    if (!existsSync(this.backupRoot)) return [];
    const result: BackupEntry[] = [];
    try {
      for (const date of readdirSync(this.backupRoot)) {
        const dateDir = path.join(this.backupRoot, date);
        if (!statSync(dateDir).isDirectory()) continue;
        for (const time of readdirSync(dateDir)) {
          const metaFile = path.join(dateDir, time, '.backup-meta.json');
          if (existsSync(metaFile)) {
            try {
              const meta = JSON.parse(readFileSync(metaFile, 'utf-8')) as BackupEntry;
              result.push(meta);
            } catch { /* skip */ }
          }
        }
      }
    } catch (err) {
      logger.warn('[auto-backup] Failed to list backups:', err);
    }
    return result.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * 删除指定备份
   */
  remove(backupId: string): boolean {
    const list = this.list();
    const target = list.find((b) => b.id === backupId);
    if (!target) return false;
    try {
      rmSync(target.path, { recursive: true, force: true });
      return true;
    } catch (err) {
      logger.error(`[auto-backup] Failed to remove ${backupId}:`, err);
      return false;
    }
  }

  // ───────────────── 内部辅助 ─────────────────

  private _findLatestBackup(): string | null {
    const list = this.list();
    if (list.length === 0) return null;
    return list[0].path; // 已按时间倒序
  }

  private _purgeOldBackups(): void {
    const list = this.list();
    if (list.length === 0) return;
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const toRemove: string[] = [];
    for (const entry of list) {
      const ageDays = (now - entry.createdAt) / dayMs;
      if (ageDays > RETENTION_DAYS_RECENT && ageDays <= RETENTION_WEEKS * 7) {
        // 每周一备份（按周日判断，简化版：每 7 天保留第一个）
        // 简化：直接保留周备份
        const dayOfWeek = new Date(entry.createdAt).getDay();
        if (dayOfWeek !== 0) {
          toRemove.push(entry.id);
        }
      } else if (ageDays > RETENTION_WEEKS * 7 && ageDays <= RETENTION_MONTHS * 30) {
        // 每月一备份
        const dayOfMonth = new Date(entry.createdAt).getDate();
        if (dayOfMonth !== 1) {
          toRemove.push(entry.id);
        }
      } else if (ageDays > RETENTION_MONTHS * 30) {
        toRemove.push(entry.id);
      }
    }
    for (const id of toRemove) {
      this.remove(id);
    }
    if (toRemove.length > 0) {
      logger.info(`[auto-backup] Purged ${toRemove.length} old backups`);
    }
  }

  private _formatSize(bytes: number): string {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}M`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}K`;
    return `${bytes}B`;
  }
}

export const autoBackup = new AutoBackupService();
