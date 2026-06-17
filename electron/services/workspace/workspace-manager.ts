/**
 * workspace-manager.ts
 *
 * 多 workspace 隔离机制（仿 QClaw 的 workspace-agent-*）。
 *
 * QClaw 的做法：
 *   - 主 workspace: ~/.qclaw/workspace/
 *   - 副 workspace: ~/.qclaw/workspace-{id}/
 *   - 每个 workspace 独立 AGENTS.md / SOUL.md / sessions / skills
 *   - 切换 workspace 时切换 openclaw.agents.defaults.workspace
 *
 * mclaw 现状：只有 1 个 workspace（~/.mclaw/workspace/）
 * 改造：加 workspace 列表管理，支持新建/切换/删除/重命名
 *
 * 数据结构：
 *   ~/.mclaw/workspaces.json          ← workspace 列表元数据
 *   ~/.mclaw/workspace/                ← 主 workspace
 *   ~/.mclaw/workspace-{id}/           ← 副 workspace
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import { logger } from '../../utils/logger';

const WORKSPACES_FILE = 'workspaces.json';

export interface WorkspaceInfo {
  id: string;            // 唯一 ID（默认 "default"，新增是 nanoid）
  name: string;          // 显示名（用户可改）
  description?: string;  // 描述
  /** 绝对路径 */
  dir: string;
  /** 是否默认 workspace（不可删除） */
  isDefault: boolean;
  /** 创建时间 */
  createdAt: number;
  /** 最后使用时间 */
  lastUsedAt: number;
  /** 关联的 agent ID（默认用 main） */
  agentId: string;
}

class WorkspaceManager {
  private mclawDir: string;
  private filePath: string;
  private cache: WorkspaceInfo[] | null = null;

  constructor() {
    this.mclawDir = path.join(homedir(), '.mclaw');
    this.filePath = path.join(this.mclawDir, WORKSPACES_FILE);
  }

  /**
   * 读 workspace 列表（lazy）
   */
  private read(): WorkspaceInfo[] {
    if (this.cache) return this.cache;
    if (!existsSync(this.filePath)) {
      // 第一次：创建默认 workspace
      this.cache = [this._createDefault()];
      this._write();
      return this.cache;
    }
    try {
      const raw = readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as WorkspaceInfo[];
      // 确保默认 workspace 存在
      if (!parsed.some((w) => w.isDefault)) {
        parsed.unshift(this._createDefault());
        this.cache = parsed;
        this._write();
      } else {
        this.cache = parsed;
      }
      return this.cache;
    } catch (err) {
      logger.warn('[workspace-manager] Failed to read, resetting:', err);
      this.cache = [this._createDefault()];
      return this.cache;
    }
  }

  private _write(): void {
    if (!this.cache) return;
    try {
      if (!existsSync(this.mclawDir)) mkdirSync(this.mclawDir, { recursive: true });
      writeFileSync(this.filePath, JSON.stringify(this.cache, null, 2), 'utf-8');
    } catch (err) {
      logger.error('[workspace-manager] Failed to write:', err);
    }
  }

  private _createDefault(): WorkspaceInfo {
    const dir = path.join(this.mclawDir, 'workspace');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return {
      id: 'default',
      name: 'Default Workspace',
      description: 'mclaw 默认工作区',
      dir,
      isDefault: true,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      agentId: 'main',
    };
  }

  /**
   * 列出所有 workspace
   */
  list(): WorkspaceInfo[] {
    return this.read();
  }

  /**
   * 按 ID 获取
   */
  get(id: string): WorkspaceInfo | undefined {
    return this.read().find((w) => w.id === id);
  }

  /**
   * 切换 workspace（更新 lastUsedAt + 写回 openclaw.json 的 agents.defaults.workspace）
   */
  activate(id: string): WorkspaceInfo | null {
    const ws = this.get(id);
    if (!ws) {
      logger.warn(`[workspace-manager] Cannot activate: workspace not found: ${id}`);
      return null;
    }
    // 更新 lastUsedAt
    this.cache = this.read().map((w) => w.id === id ? { ...w, lastUsedAt: Date.now() } : w);
    this._write();

    // 同步到 openclaw.json
    this._syncToOpenClawConfig(ws.dir);
    logger.info(`[workspace-manager] Activated workspace: ${ws.name} (${ws.id})`);
    return ws;
  }

  /**
   * 新建 workspace
   */
  create(opts: { name: string; description?: string; agentId?: string }): WorkspaceInfo {
    const id = (() => {
      try { return require('crypto').randomBytes(6).toString('hex'); }
      catch { return `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
    })();
    const dir = path.join(this.mclawDir, `workspace-${id}`);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const ws: WorkspaceInfo = {
      id,
      name: opts.name,
      description: opts.description,
      dir,
      isDefault: false,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      agentId: opts.agentId ?? 'main',
    };
    this.cache = [...this.read(), ws];
    this._write();
    logger.info(`[workspace-manager] Created workspace: ${ws.name} (${ws.id})`);
    return ws;
  }

  /**
   * 重命名
   */
  rename(id: string, newName: string): boolean {
    const list = this.read();
    const idx = list.findIndex((w) => w.id === id);
    if (idx === -1) return false;
    if (list[idx].isDefault) {
      logger.warn(`[workspace-manager] Cannot rename default workspace`);
      return false;
    }
    list[idx] = { ...list[idx], name: newName };
    this.cache = list;
    this._write();
    return true;
  }

  /**
   * 删除（默认不可删）
   */
  remove(id: string, opts: { removeDir?: boolean } = {}): boolean {
    const list = this.read();
    const target = list.find((w) => w.id === id);
    if (!target) return false;
    if (target.isDefault) {
      logger.warn(`[workspace-manager] Cannot remove default workspace`);
      return false;
    }
    this.cache = list.filter((w) => w.id !== id);
    this._write();
    if (opts.removeDir && existsSync(target.dir)) {
      try { rmSync(target.dir, { recursive: true, force: true }); }
      catch (err) { logger.warn(`[workspace-manager] Failed to remove dir ${target.dir}:`, err); }
    }
    logger.info(`[workspace-manager] Removed workspace: ${target.name} (${id})`);
    return true;
  }

  /**
   * 同步当前 workspace 到 openclaw.json
   * （让 openclaw 知道 workspace 目录在哪里）
   */
  private _syncToOpenClawConfig(workspaceDir: string): void {
    const configPath = path.join(this.mclawDir, 'openclaw.json');
    if (!existsSync(configPath)) return;
    try {
      const raw = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(raw);
      config.agents = config.agents || {};
      config.agents.defaults = config.agents.defaults || {};
      config.agents.defaults.workspace = workspaceDir;
      writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      logger.debug(`[workspace-manager] Synced workspace to openclaw.json: ${workspaceDir}`);
    } catch (err) {
      logger.warn(`[workspace-manager] Failed to sync openclaw.json:`, err);
    }
  }
}

export const workspaceManager = new WorkspaceManager();
