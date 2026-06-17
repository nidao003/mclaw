/**
 * mclaw-plugin-schema.ts
 *
 * mclaw 扩展元数据规范（仿 QClaw 的 openclaw.plugin.json）。
 *
 * 扩展目录位置：
 *   - 运行时：~/Library/Application Support/mclaw/openclaw/config/extensions/<ext-name>/
 *   - 内置预装：build/mawruntime/config/extensions/<ext-name>/（随 tarball 解包后只读）
 *
 * 目录结构：
 *   <ext-name>/
 *   ├── package.json                  # npm 风格包描述
 *   ├── mclaw.plugin.json             # 扩展元数据（必填）
 *   ├── index.js 或 index.ts          # 入口（必填）
 *   ├── skills/                       # 扩展自带的 skills（可选）
 *   ├── node_modules/                 # 扩展自己的依赖（可选，自带 .node 原生模块）
 *   └── README.md
 *
 * QClaw 的 openclaw.plugin.json 字段（参考）：
 *   { name, version, main, permissions, skills, dependencies, ... }
 *
 * mclaw 简化版（向后兼容 openclaw.plugin.json 但不强依赖）：
 *   - mclawManifestVersion: 1
 *   - name, version, displayName, description
 *   - main, engines, permissions, skills, dependencies
 *   - platforms: { darwin, win32, linux } 用于跨平台控制
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { logger } from '../../utils/logger';

/** mclaw plugin manifest 版本 */
export const MCLAW_PLUGIN_MANIFEST_VERSION = 1;

/** 扩展权限声明 */
export type MclawPluginPermission =
  | 'network'        // 访问网络
  | 'filesystem:read' // 读文件
  | 'filesystem:write' // 写文件
  | 'shell:exec'      // 执行 shell
  | 'clipboard:read'  // 读剪贴板
  | 'clipboard:write' // 写剪贴板
  | 'screenshot'      // 截屏
  | 'audio:record'    // 录音
  | 'video:record'    // 录像
  | 'notifications'   // 系统通知
  | 'tray'            // 系统托盘
  | 'globalShortcut'  // 全局快捷键
  | 'autoLaunch';     // 开机自启

export interface MclawPluginPlatformSpec {
  /** 是否支持当前平台 */
  enabled: boolean;
  /** 平台特定的入口（覆盖顶层 main） */
  main?: string;
  /** 平台特定的资源 */
  resources?: string[];
  /** 平台特定的依赖（覆盖顶层 dependencies） */
  dependencies?: Record<string, string>;
}

export interface MclawPluginManifest {
  /** 清单版本 */
  mclawManifestVersion: number;
  /** 扩展唯一 ID（必须与目录名一致） */
  name: string;
  /** 语义化版本 */
  version: string;
  /** 显示名（中文） */
  displayName: string;
  /** 描述 */
  description: string;
  /** 作者 */
  author?: string;
  /** 主页/文档 URL */
  homepage?: string;
  /** 入口文件（相对扩展根目录） */
  main: string;
  /** 引擎要求 */
  engines?: {
    mclaw?: string;       // mclaw 版本范围
    openclaw?: string;    // openclaw 版本范围
    node?: string;        // Node 版本范围
  };
  /** 权限声明 */
  permissions: MclawPluginPermission[];
  /** 扩展自带的 skills（相对扩展根目录的路径） */
  skills?: string[];
  /** 依赖的其他扩展 */
  dependencies?: Record<string, string>;
  /** 平台特定配置 */
  platforms?: {
    darwin?: MclawPluginPlatformSpec;
    win32?: MclawPluginPlatformSpec;
    linux?: MclawPluginPlatformSpec;
  };
  /** 图标路径（相对扩展根目录） */
  icon?: string;
  /** 分类 */
  category?: 'channel' | 'integration' | 'tool' | 'theme' | 'language' | 'other';
  /** 是否预装（true 时不允许卸载） */
  builtin?: boolean;
  /** 额外的 OpenClaw 兼容字段（透传） */
  openclawPlugin?: Record<string, unknown>;
}

export interface LoadedMclawPlugin {
  manifest: MclawPluginManifest;
  /** 扩展根目录绝对路径 */
  rootDir: string;
  /** 入口绝对路径 */
  entryAbsPath: string;
  /** 是否对应当前平台 */
  enabledOnPlatform: boolean;
  /** 是否 builtin */
  builtin: boolean;
  /** 加载错误（如果加载失败） */
  error?: string;
}

/**
 * 读取并解析扩展清单
 */
export function readMclawPluginManifest(extensionRoot: string): MclawPluginManifest | null {
  const manifestPath = path.join(extensionRoot, 'mclaw.plugin.json');
  if (!existsSync(manifestPath)) {
    return null;
  }
  try {
    const raw = readFileSync(manifestPath, 'utf-8');
    const parsed = JSON.parse(raw) as MclawPluginManifest;
    if (!parsed.name || !parsed.version || !parsed.main) {
      logger.warn(`[plugin-schema] Invalid manifest at ${manifestPath}: missing name/version/main`);
      return null;
    }
    return parsed;
  } catch (err) {
    logger.warn(`[plugin-schema] Failed to parse ${manifestPath}:`, err);
    return null;
  }
}

/**
 * 验证清单（schema 校验）
 */
export function validateMclawPluginManifest(manifest: MclawPluginManifest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (manifest.mclawManifestVersion !== MCLAW_PLUGIN_MANIFEST_VERSION) {
    errors.push(`Unsupported mclawManifestVersion: ${manifest.mclawManifestVersion} (expected ${MCLAW_PLUGIN_MANIFEST_VERSION})`);
  }
  if (!manifest.name || !/^[a-z0-9][a-z0-9._-]*$/.test(manifest.name)) {
    errors.push(`Invalid name: ${manifest.name} (must match /^[a-z0-9][a-z0-9._-]*$/)`);
  }
  if (!manifest.version || !/^\d+\.\d+\.\d+/.test(manifest.version)) {
    errors.push(`Invalid version: ${manifest.version} (must be semver)`);
  }
  if (!manifest.main || typeof manifest.main !== 'string') {
    errors.push(`Missing or invalid 'main' field`);
  }
  if (!Array.isArray(manifest.permissions)) {
    errors.push(`'permissions' must be an array`);
  }
  if (manifest.skills && !Array.isArray(manifest.skills)) {
    errors.push(`'skills' must be an array of strings`);
  }
  return { valid: errors.length === 0, errors };
}

/**
 * 检查扩展是否在当前平台启用
 */
export function isPluginEnabledOnPlatform(manifest: MclawPluginManifest): boolean {
  if (!manifest.platforms) return true;
  const platformKey = (() => {
    switch (process.platform) {
      case 'darwin': return 'darwin';
      case 'win32': return 'win32';
      default: return 'linux';
    }
  })();
  const platformSpec = manifest.platforms[platformKey as keyof typeof manifest.platforms];
  if (platformSpec && platformSpec.enabled === false) return false;
  return true;
}

/**
 * 解析入口（考虑平台覆盖）
 */
export function resolvePluginEntry(manifest: MclawPluginManifest, extensionRoot: string): string {
  const platformKey = (() => {
    switch (process.platform) {
      case 'darwin': return 'darwin';
      case 'win32': return 'win32';
      default: return 'linux';
    }
  })();
  const platformSpec = manifest.platforms?.[platformKey as keyof typeof manifest.platforms];
  const mainRel = platformSpec?.main ?? manifest.main;
  return path.resolve(extensionRoot, mainRel);
}
