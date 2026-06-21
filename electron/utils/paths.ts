/**
 * Path Utilities
 * Cross-platform path resolution helpers
 */
import { createRequire } from 'node:module';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync, readFileSync, realpathSync } from 'fs';

const require = createRequire(import.meta.url);

type ElectronAppLike = Pick<typeof import('electron').app, 'isPackaged' | 'getPath' | 'getAppPath'>;

export {
  quoteForCmd,
  needsWinShell,
  prepareWinSpawn,
  normalizeNodeRequirePathForNodeOptions,
  appendNodeRequireToNodeOptions,
} from './win-shell';

function getElectronApp() {
  if (process.versions?.electron) {
    return (require('electron') as typeof import('electron')).app;
  }

  const fallbackUserData = process.env.MCLAW_USER_DATA_DIR?.trim() || join(homedir(), '.mclaw');
  const fallbackAppPath = process.cwd();
  const fallbackApp: ElectronAppLike = {
    isPackaged: false,
    getPath: (name) => {
      if (name === 'userData') return fallbackUserData;
      return fallbackUserData;
    },
    getAppPath: () => fallbackAppPath,
  };
  return fallbackApp;
}

/**
 * Expand ~ to home directory
 */
export function expandPath(path: string): string {
  if (path.startsWith('~')) {
    return path.replace('~', homedir());
  }
  return path;
}

/**
 * Get OpenClaw config directory
 */
export function getOpenClawConfigDir(): string {
  return join(homedir(), '.mclaw');
}

/**
 * Get OpenClaw skills directory
 */
export function getOpenClawSkillsDir(): string {
  return join(getOpenClawConfigDir(), 'skills');
}

/**
 * Get mclaw config directory
 */
export function getmclawConfigDir(): string {
  return join(homedir(), '.mclaw');
}

/**
 * Get mclaw logs directory
 */
export function getLogsDir(): string {
  return join(getElectronApp().getPath('userData'), 'logs');
}

/**
 * Get mclaw data directory
 */
export function getDataDir(): string {
  return getElectronApp().getPath('userData');
}

/**
 * Ensure directory exists
 */
export function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Get resources directory (for bundled assets)
 */
export function getResourcesDir(): string {
  if (getElectronApp().isPackaged) {
    return join(process.resourcesPath, 'resources');
  }
  return join(__dirname, '../../resources');
}

/**
 * Get preload script path
 */
export function getPreloadPath(): string {
  return join(__dirname, '../preload/index.js');
}

/**
 * Get OpenClaw package directory
 * - Production (packaged): from runtime 解包后的 mawruntime/node_modules/openclaw
 * - Development: from node_modules/openclaw
 *
 * 注意：QClaw 模式下，这里是解包目标，不是原始 tar 路径。
 * unpack-mclaw.cjs 在 App 启动时把 resources/mawruntime/mawruntime.tar.gz
 * 解到 getMclawRuntimeDir()，所以 getMclawDir() 直接读解包结果。
 */
export function getMclawDir(): string {
  if (getElectronApp().isPackaged) {
    // packaged 模式：读解包后的 runtime
    return join(getMclawRuntimeDir(), 'node_modules', 'openclaw');
  }
  // Development: use node_modules/openclaw
  return join(__dirname, '../../node_modules/openclaw');
}

/**
 * mclaw 运行时根目录（解包后）
 *   - macOS:   ~/Library/Application Support/mclaw/openclaw/
 *   - Windows: %APPDATA%/mclaw/openclaw/
 *   - Linux:   ~/.config/mclaw/openclaw/
 *
 * dev 模式：解包可能还没做（pnpm dev 直接用 node_modules），所以 fallback 到 build/mawruntime
 */
export function getMclawRuntimeDir(): string {
  if (getElectronApp().isPackaged) {
    // packaged：userData 下的 openclaw/，由 unpack-mclaw.cjs 填好
    return join(getElectronApp().getPath('userData'), 'openclaw');
  }
  // dev 模式：脚本在 scripts/，build/mawruntime 是 bundle 后的目录
  return join(__dirname, '../../build/mawruntime');
}

/**
 * 启动 mclaw-gateway 的独立 Node 二进制路径
 *   - macOS:   Resources/bin/darwin-{arch}/node
 *   - Windows: Resources/bin/win32-{arch}/node.exe
 *   - Linux:   Resources/bin/linux-{arch}/node
 *
 * dev 模式：找系统 PATH 里的 node（pnpm 调试够用）
 * 找不到时返回空字符串，让 process-launcher 走 utilityProcess fallback
 */
export function getMclawGatewayNodeBinary(): string {
  if (getElectronApp().isPackaged) {
    const target = `${process.platform}-${process.arch}`;
    const binDir = join(process.resourcesPath, 'bin', target);
    const binName = process.platform === 'win32' ? 'node.exe' : 'node';
    return join(binDir, binName);
  }

  // dev 模式：优先用 resources/bin/darwin-{arch}/node（如果用户下载过）
  // 否则找系统 PATH 里的 node
  const devBinDir = join(__dirname, '..', '..', 'resources', 'bin', `${process.platform}-${process.arch}`);
  const localBin = process.platform === 'win32' ? join(devBinDir, 'node.exe') : join(devBinDir, 'node');
  if (existsSync(localBin)) return localBin;

  // 找系统 PATH 里的 node
  const { spawnSync } = require('node:child_process');
  const which = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(which, ['node'], { encoding: 'utf-8' });
  if (result.status === 0) {
    const nodePath = result.stdout.trim().split('\n')[0].trim();
    if (nodePath) return nodePath;
  }

  // 找不到系统 node，返回空让 process-launcher 走 utilityProcess fallback
  return '';
}

/**
 * 一次性完成运行时解包 + 等待就绪
 * 在 mclaw 主进程启动早期调用一次，确保 Gateway 启动前 runtime 已就位
 */
export async function ensureMclawRuntimeExtracted(): Promise<{ ok: boolean; reason?: string }> {
  const { spawn } = await import('node:child_process');
  const { existsSync } = await import('node:fs');

  if (getElectronApp().isPackaged) {
    const target = getMclawRuntimeDir();
    const versionFile = join(target, '.runtime-version.json');
    if (existsSync(versionFile)) {
      return { ok: true };
    }
    // 调用 unpack-mclaw.cjs
    const scriptPath = join(process.resourcesPath, 'scripts', 'unpack-mclaw.cjs');
    if (!existsSync(scriptPath)) {
      return { ok: false, reason: `unpack-mclaw.cjs not found at ${scriptPath}` };
    }
    const nodeBin = getMclawGatewayNodeBinary();
    return new Promise((resolve) => {
      const child = spawn(nodeBin, [scriptPath], { stdio: 'inherit' });
      child.on('exit', (code) => {
        if (code === 0) resolve({ ok: true });
        else resolve({ ok: false, reason: `unpack-mclaw.cjs exited with code ${code}` });
      });
      child.on('error', (err) => resolve({ ok: false, reason: err.message }));
    });
  }

  // dev 模式：runtime 由 build/ 提供，确保目录存在即可
  const { ensureDir } = await import('./paths');
  ensureDir(getMclawRuntimeDir());
  return { ok: true };
}

/**
 * Get OpenClaw package directory resolved to a real path.
 * Useful when consumers need deterministic module resolution under pnpm symlinks.
 */
export function getOpenClawResolvedDir(): string {
  const dir = getMclawDir();
  if (!existsSync(dir)) {
    return dir;
  }
  try {
    return realpathSync(dir);
  } catch {
    return dir;
  }
}

/**
 * Get OpenClaw entry script path (openclaw.mjs)
 */
export function getOpenClawEntryPath(): string {
  return join(getMclawDir(), 'openclaw.mjs');
}

/**
 * Get ClawHub CLI entry script path (clawdhub.js)
 */
export function getClawHubCliEntryPath(): string {
  return join(getElectronApp().getAppPath(), 'node_modules', 'clawhub', 'bin', 'clawdhub.js');
}

/**
 * Get ClawHub CLI binary path (node_modules/.bin)
 */
export function getClawHubCliBinPath(): string {
  const binName = process.platform === 'win32' ? 'clawhub.cmd' : 'clawhub';
  return join(getElectronApp().getAppPath(), 'node_modules', '.bin', binName);
}

/**
 * Check if OpenClaw package exists
 */
export function isOpenClawPresent(): boolean {
  const dir = getMclawDir();
  const pkgJsonPath = join(dir, 'package.json');
  return existsSync(dir) && existsSync(pkgJsonPath);
}

/**
 * Check if OpenClaw is built (has dist folder)
 * For the npm package, this should always be true since npm publishes the built dist.
 */
export function isOpenClawBuilt(): boolean {
  const dir = getMclawDir();
  const distDir = join(dir, 'dist');
  const hasDist = existsSync(distDir);
  return hasDist;
}

/**
 * Get OpenClaw status for environment check
 */
export interface OpenClawStatus {
  packageExists: boolean;
  isBuilt: boolean;
  entryPath: string;
  dir: string;
  version?: string;
}

export function getOpenClawStatus(): OpenClawStatus {
  const dir = getMclawDir();
  let version: string | undefined;

  // Try to read version from package.json
  try {
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      version = pkg.version;
    }
  } catch {
    // Ignore version read errors
  }

  const status: OpenClawStatus = {
    packageExists: isOpenClawPresent(),
    isBuilt: isOpenClawBuilt(),
    entryPath: getOpenClawEntryPath(),
    dir,
    version,
  };

  try {
    const { logger } = require('./logger') as typeof import('./logger');
    logger.info('OpenClaw status:', status);
  } catch {
    // Ignore logger bootstrap issues in non-Electron contexts such as unit tests.
  }
  return status;
}
