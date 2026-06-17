/**
 * extension-loader.ts
 *
 * mclaw 扩展加载器（仿 QClaw 扩展机制）。
 *
 * 启动时扫描以下目录，加载所有扩展：
 *   1. 内置预装：build/mawruntime/config/extensions/*（随 tarball 解包）
 *   2. 用户级：~/Library/Application Support/mclaw/openclaw/config/extensions/*
 *
 * QClaw 的扩展加载特点：
 *   - 每个扩展是独立 npm 包，自带 node_modules/
 *   - 扩展可以运行时安装/卸载
 *   - 扩展可以有自己的原生模块（.node 文件）
 *   - 扩展入口是一个 JS/TS 文件
 *
 * mclaw 实现：
 *   - 扫描时按 manifest 顺序加载
 *   - 用户级扩展覆盖内置扩展（同名）
 *   - 加载失败不阻塞其他扩展
 *   - 支持热重载（开发模式）
 */
import { existsSync, readdirSync, statSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { logger } from '../../utils/logger';
import {
  type LoadedMclawPlugin,
  readMclawPluginManifest,
  validateMclawPluginManifest,
  isPluginEnabledOnPlatform,
  resolvePluginEntry,
} from './mclaw-plugin-schema';

const RUNTIME_EXTENSIONS_SUBDIR = 'config/extensions';

export class MclawExtensionLoader {
  private loaded: Map<string, LoadedMclawPlugin> = new Map();
  private runtimeDir: string;

  constructor(runtimeDir: string) {
    this.runtimeDir = runtimeDir;
  }

  /**
   * 扫描并加载所有扩展
   */
  loadAll(): LoadedMclawPlugin[] {
    const startTime = Date.now();
    this.loaded.clear();

    // 1) 内置预装（在 runtime dir 内，只读）
    const builtinDir = path.join(this.runtimeDir, RUNTIME_EXTENSIONS_SUBDIR);
    if (existsSync(builtinDir)) {
      this._scanDir(builtinDir, true);
    }

    // 2) 用户级（userData 下的可写扩展，可覆盖内置）
    const userDir = this._getUserExtensionsDir();
    if (existsSync(userDir)) {
      this._scanDir(userDir, false);
    }

    const elapsed = Date.now() - startTime;
    logger.info(`[extension-loader] Loaded ${this.loaded.size} extensions in ${elapsed}ms`);
    return [...this.loaded.values()];
  }

  /**
   * 列出已加载扩展
   */
  list(): LoadedMclawPlugin[] {
    return [...this.loaded.values()];
  }

  /**
   * 按名称查找
   */
  get(name: string): LoadedMclawPlugin | undefined {
    return this.loaded.get(name);
  }

  /**
   * 启用/禁用扩展
   */
  setEnabled(name: string, enabled: boolean): boolean {
    const ext = this.loaded.get(name);
    if (!ext) return false;
    if (ext.builtin) {
      logger.warn(`[extension-loader] Cannot disable builtin extension: ${name}`);
      return false;
    }
    const disabledFile = path.join(ext.rootDir, '.disabled');
    try {
      if (enabled) {
        if (existsSync(disabledFile)) rmSync(disabledFile);
      } else {
        writeFileSync(disabledFile, new Date().toISOString(), 'utf-8');
      }
      // 重新扫描
      this.loadAll();
      return true;
    } catch (err) {
      logger.error(`[extension-loader] Failed to setEnabled(${name}, ${enabled}):`, err);
      return false;
    }
  }

  /**
   * 卸载扩展（删除目录）
   */
  uninstall(name: string): boolean {
    const ext = this.loaded.get(name);
    if (!ext) return false;
    if (ext.builtin) {
      logger.warn(`[extension-loader] Cannot uninstall builtin extension: ${name}`);
      return false;
    }
    try {
      rmSync(ext.rootDir, { recursive: true, force: true });
      this.loaded.delete(name);
      logger.info(`[extension-loader] Uninstalled extension: ${name}`);
      return true;
    } catch (err) {
      logger.error(`[extension-loader] Failed to uninstall ${name}:`, err);
      return false;
    }
  }

  /**
   * 从一个 .mclaw-plugin 包安装扩展（运行时安装）
   *
   * QClaw 通过解压 tarball 方式安装，mclaw 也支持 .tar.gz 包
   */
  installFromTarball(tarballPath: string): { ok: boolean; name?: string; error?: string } {
    const userDir = this._getUserExtensionsDir();
    if (!existsSync(userDir)) {
      mkdirSync(userDir, { recursive: true });
    }

    // 简单实现：解压到临时目录，读 manifest，按 name 移到 userDir/<name>
    const { spawnSync } = require('node:child_process');
    const tempDir = path.join(os.tmpdir(), `mclaw-install-${Date.now()}`);
    try {
      mkdirSync(tempDir, { recursive: true });
      const extractResult = spawnSync('tar', ['-xzf', tarballPath, '-C', tempDir], { stdio: 'pipe' });
      if (extractResult.status !== 0) {
        return { ok: false, error: `tar failed: ${extractResult.stderr?.toString()}` };
      }

      const entries = readdirSync(tempDir);
      if (entries.length !== 1) {
        return { ok: false, error: `Tarball should contain exactly one extension directory, found ${entries.length}` };
      }
      const extractedRoot = path.join(tempDir, entries[0]);
      const manifest = readMclawPluginManifest(extractedRoot);
      if (!manifest) {
        return { ok: false, error: 'Tarball does not contain valid mclaw.plugin.json' };
      }
      const validation = validateMclawPluginManifest(manifest);
      if (!validation.valid) {
        return { ok: false, error: `Invalid manifest: ${validation.errors.join(', ')}` };
      }

      // 已存在则先卸载
      const targetDir = path.join(userDir, manifest.name);
      if (existsSync(targetDir)) {
        rmSync(targetDir, { recursive: true, force: true });
      }

      // 移动到用户目录
      const mvResult = spawnSync('mv', [extractedRoot, targetDir], { stdio: 'pipe' });
      if (mvResult.status !== 0) {
        return { ok: false, error: `mv failed: ${mvResult.stderr?.toString()}` };
      }

      // 重新扫描
      this.loadAll();
      logger.info(`[extension-loader] Installed ${manifest.name}@${manifest.version} from ${tarballPath}`);
      return { ok: true, name: manifest.name };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    } finally {
      if (existsSync(tempDir)) {
        try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
      }
    }
  }

  // ───────────────── 内部辅助 ─────────────────

  private _getUserExtensionsDir(): string {
    // 用户级扩展 = runtime 目录下的 config/extensions/
    // （跟内置放在同结构下，但语义上是"用户安装的"）
    return path.join(this.runtimeDir, RUNTIME_EXTENSIONS_SUBDIR);
  }

  private _scanDir(dir: string, builtin: boolean): void {
    if (!existsSync(dir)) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch (err) {
      logger.warn(`[extension-loader] Failed to read ${dir}:`, err);
      return;
    }

    for (const entry of entries) {
      if (entry.startsWith('.')) continue;
      const extDir = path.join(dir, entry);
      try {
        if (!statSync(extDir).isDirectory()) continue;
      } catch { continue; }

      // 检查 .disabled 标记
      if (!builtin && existsSync(path.join(extDir, '.disabled'))) {
        continue;
      }

      const manifest = readMclawPluginManifest(extDir);
      if (!manifest) {
        logger.debug(`[extension-loader] Skipping ${entry}: no valid mclaw.plugin.json`);
        continue;
      }
      const validation = validateMclawPluginManifest(manifest);
      if (!validation.valid) {
        logger.warn(`[extension-loader] Invalid manifest for ${entry}: ${validation.errors.join(', ')}`);
        continue;
      }
      if (!isPluginEnabledOnPlatform(manifest)) {
        logger.debug(`[extension-loader] ${entry} disabled on platform ${process.platform}`);
        continue;
      }

      const entryAbsPath = resolvePluginEntry(manifest, extDir);
      const exists = existsSync(entryAbsPath);
      if (!exists) {
        logger.warn(`[extension-loader] ${entry} entry not found: ${entryAbsPath}`);
      }

      const loaded: LoadedMclawPlugin = {
        manifest,
        rootDir: extDir,
        entryAbsPath,
        enabledOnPlatform: true,
        builtin,
        error: exists ? undefined : 'entry file not found',
      };

      // 用户级覆盖 builtin（同 name）
      if (this.loaded.has(manifest.name) && this.loaded.get(manifest.name)!.builtin && !builtin) {
        logger.info(`[extension-loader] User extension ${manifest.name} overrides builtin`);
      }
      this.loaded.set(manifest.name, loaded);
    }
  }
}

// 单例（main 进程启动时 init）
let _instance: MclawExtensionLoader | null = null;
export function getMclawExtensionLoader(runtimeDir?: string): MclawExtensionLoader {
  if (!_instance) {
    if (!runtimeDir) {
      throw new Error('Extension loader not initialized. Call initMclawExtensionLoader(runtimeDir) first.');
    }
    _instance = new MclawExtensionLoader(runtimeDir);
  }
  return _instance;
}

export function initMclawExtensionLoader(runtimeDir: string): MclawExtensionLoader {
  _instance = new MclawExtensionLoader(runtimeDir);
  return _instance;
}
