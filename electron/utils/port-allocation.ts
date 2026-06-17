/**
 * port-allocation.ts
 *
 * 动态端口分配（QClaw 模式：避免多实例冲突）。
 *
 * 策略：
 *   1. 优先用 PORTS.OPENCLAW_GATEWAY（18999）
 *   2. 如果被占用，扫 19000-19099 范围找空闲
 *   3. 找不到就返回 0（让 OS 分配）
 *
 * 注意：分配完的端口要写进 mclaw.json 指针文件，
 * 外部 CLI 工具（mclaw status）能正确找到目标。
 */
import { createServer, type Server } from 'node:net';
import { logger } from './logger';

const PREFERRED = 18999;
const FALLBACK_RANGE_START = 19000;
const FALLBACK_RANGE_END = 19099;

/**
 * 检查端口是否空闲（异步，listen 后立即 close）
 */
async function isPortFree(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const server: Server = createServer();
    let resolved = false;
    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      server.removeAllListeners();
      try { server.close(); } catch { /* ignore */ }
    };
    server.once('error', () => {
      cleanup();
      resolve(false);
    });
    server.once('listening', () => {
      cleanup();
      resolve(true);
    });
    // Windows 上 listen 0 是 OS 分配，但我们这里只想检查具体端口
    try {
      server.listen(port, host);
    } catch {
      cleanup();
      resolve(false);
    }
  });
}

/**
 * 找一个空闲端口
 */
export async function findFreeGatewayPort(): Promise<number> {
  // 1. 首选端口
  if (await isPortFree(PREFERRED)) {
    logger.debug(`[port-allocation] Using preferred port: ${PREFERRED}`);
    return PREFERRED;
  }

  // 2. 扫 fallback 范围
  for (let port = FALLBACK_RANGE_START; port <= FALLBACK_RANGE_END; port++) {
    if (await isPortFree(port)) {
      logger.info(`[port-allocation] Preferred ${PREFERRED} busy, using fallback: ${port}`);
      return port;
    }
  }

  // 3. 让 OS 分配（端口 0）
  logger.warn(`[port-allocation] No port in ${FALLBACK_RANGE_START}-${FALLBACK_RANGE_END} free, using OS-assigned`);
  return 0;
}

/**
 * 同步快速检查（不推荐，仅用于"已知刚刚被自己占用"的判断）
 */
export function getPreferredPort(): number {
  return PREFERRED;
}
