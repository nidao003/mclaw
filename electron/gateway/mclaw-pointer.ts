/**
 * mclaw-pointer.ts
 *
 * 写 ~/.mclaw/mclaw.json 指针文件（仿 QClaw qclaw.json）。
 *
 * 这个文件是 mclaw-gateway 子进程的"名片"，给：
 *   - 外部 CLI 工具（mclaw status / mclaw logs）
 *   - 调试/监控脚本
 *   - 多实例检测
 *   - 自动备份/同步工具
 *
 * QClaw 的 qclaw.json 内容：
 *   {
 *     "cli": { nodeBinary, openclawMjs, pid },
 *     "stateDir", "configPath", "port", "platform",
 *     "authGatewayBaseUrl", "sharedParams": { guid, appVersion, appChannel, platform, sessionId }
 *   }
 *
 * mclaw 不需要 authGatewayBaseUrl（没接腾讯 SDK），但保留其他字段。
 */
import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import { app } from 'electron';
import { logger } from '../utils/logger';

const POINTER_FILENAME = 'mclaw.json';

export interface MclawPointer {
  cli: {
    /** 启动 Gateway 用的 Node 二进制绝对路径 */
    nodeBinary: string;
    /** openclaw 入口脚本绝对路径（解包后的） */
    openclawMjs: string;
    /** Gateway 子进程 PID */
    pid: number | undefined;
  };
  /** 状态目录根（= ~/.mclaw/） */
  stateDir: string;
  /** openclaw.json 配置路径 */
  configPath: string;
  /** Gateway 监听端口（动态分配） */
  port: number;
  /** 平台标识：darwin / win32 / linux */
  platform: string;
  /** 当前架构：x64 / arm64 */
  arch: string;
  /** 启动模式：standalone-node（独立 Node） | utility-process（fallback） */
  mode: string;
  /** Gateway 启动时间（ms since epoch） */
  startedAt: number;
  /** mclaw 共享参数（QClaw 风格的 sharedParams） */
  sharedParams: {
    appVersion: string;
    platform: string; // 平台标识 e.g. "mclaw_MAC_ARM"
    sessionId: string;
  };
}

/**
 * 写 mclaw.json 指针文件
 */
export function writeMclawPointerFile(opts: {
  mode: string;
  pid: number | undefined;
  port: number;
  nodeBinary: string;
  entryScript: string;
  runtimeDir: string;
  startedAt: number;
}): void {
  const stateDir = path.join(homedir(), '.mclaw');
  const configPath = path.join(stateDir, 'openclaw.json');

  // 平台标识符（QClaw 风格：Qclaw_MAC_ARM）
  const platformLabel = (() => {
    const archShort = process.arch === 'arm64' ? 'ARM' : 'X64';
    switch (process.platform) {
      case 'darwin': return `mclaw_MAC_${archShort}`;
      case 'win32': return `mclaw_WIN_${archShort}`;
      default: return `mclaw_LINUX_${archShort}`;
    }
  })();

  const appVersion = (() => {
    try { return app.getVersion(); } catch { return 'unknown'; }
  })();

  const sessionId = (() => {
    try {
      return require('crypto').randomUUID();
    } catch {
      return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }
  })();

  const pointer: MclawPointer = {
    cli: {
      nodeBinary: opts.nodeBinary,
      openclawMjs: opts.entryScript,
      pid: opts.pid,
    },
    stateDir,
    configPath,
    port: opts.port,
    platform: process.platform,
    arch: process.arch,
    mode: opts.mode,
    startedAt: opts.startedAt,
    sharedParams: {
      appVersion,
      platform: platformLabel,
      sessionId,
    },
  };

  const pointerPath = path.join(stateDir, POINTER_FILENAME);
  try {
    writeFileSync(pointerPath, JSON.stringify(pointer, null, 2), 'utf-8');
    logger.info(`[mclaw-pointer] Wrote ${pointerPath} (pid=${opts.pid}, port=${opts.port}, mode=${opts.mode})`);
  } catch (err) {
    logger.warn(`[mclaw-pointer] Failed to write ${pointerPath}:`, err);
  }
}

/**
 * Gateway 退出时清掉指针文件里的 pid（不删整个文件，下次启动会重写）
 *
 * 关键：只清 pid 字段，不删整个文件，避免文件被其他进程读到的瞬间变成"空状态"
 */
export function clearMclawPointerFile(pid: number | undefined): void {
  if (pid === undefined) return;
  const stateDir = path.join(homedir(), '.mclaw');
  const pointerPath = path.join(stateDir, POINTER_FILENAME);
  if (!existsSync(pointerPath)) return;
  try {
    const raw = readFileSync(pointerPath, 'utf-8');
    const pointer = JSON.parse(raw) as MclawPointer;
    if (pointer.cli?.pid === pid) {
      // 这个 pid 是我们自己的，清掉
      pointer.cli.pid = undefined;
      writeFileSync(pointerPath, JSON.stringify(pointer, null, 2), 'utf-8');
      logger.debug(`[mclaw-pointer] Cleared pid ${pid} from ${pointerPath}`);
    }
  } catch (err) {
    logger.debug(`[mclaw-pointer] Failed to clear pid: ${err}`);
  }
}

/**
 * 读 mclaw.json 指针文件（外部 CLI 工具会调用）
 */
export function readMclawPointerFile(): MclawPointer | null {
  const stateDir = path.join(homedir(), '.mclaw');
  const pointerPath = path.join(stateDir, POINTER_FILENAME);
  if (!existsSync(pointerPath)) return null;
  try {
    return JSON.parse(readFileSync(pointerPath, 'utf-8')) as MclawPointer;
  } catch {
    return null;
  }
}

/**
 * 删除整个指针文件（卸载/重置时用）
 */
export function deleteMclawPointerFile(): void {
  const stateDir = path.join(homedir(), '.mclaw');
  const pointerPath = path.join(stateDir, POINTER_FILENAME);
  try {
    unlinkSync(pointerPath);
  } catch { /* ignore ENOENT */ }
}
