import { app, utilityProcess } from 'electron';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { GatewayLaunchContext } from './config-sync';
import type { GatewayLifecycleState } from './process-policy';
import { logger } from '../utils/logger';
import { appendNodeRequireToNodeOptions, getOpenClawConfigDir, getMclawRuntimeDir, getMclawGatewayNodeBinary } from '../utils/paths';
import { writeMclawPointerFile, clearMclawPointerFile } from './mclaw-pointer';

const GATEWAY_FETCH_PRELOAD_SOURCE = `'use strict';
(function () {
  var _f = globalThis.fetch;
  if (typeof _f !== 'function') return;
  if (globalThis.__mclawFetchPatched) return;
  globalThis.__mclawFetchPatched = true;

  globalThis.fetch = function mclawFetch(input, init) {
    var url =
      typeof input === 'string' ? input
        : input && typeof input === 'object' && typeof input.url === 'string'
          ? input.url : '';

    if (url.indexOf('openrouter.ai') !== -1) {
      init = init ? Object.assign({}, init) : {};
      var prev = init.headers;
      var flat = {};
      if (prev && typeof prev.forEach === 'function') {
        prev.forEach(function (v, k) { flat[k] = v; });
      } else if (prev && typeof prev === 'object') {
        Object.assign(flat, prev);
      }
      delete flat['http-referer'];
      delete flat['HTTP-Referer'];
      delete flat['x-title'];
      delete flat['X-Title'];
      delete flat['x-openrouter-title'];
      delete flat['X-OpenRouter-Title'];
      flat['HTTP-Referer'] = 'https://claw-x.com';
      flat['X-OpenRouter-Title'] = 'mclaw';
      init.headers = flat;
    }
    return _f.call(globalThis, input, init);
  };

  if (process.platform === 'win32') {
    try {
      var cp = require('child_process');
      if (!cp.__mclawPatched) {
        cp.__mclawPatched = true;
        ['spawn', 'exec', 'execFile', 'fork', 'spawnSync', 'execSync', 'execFileSync'].forEach(function(method) {
          var original = cp[method];
          if (typeof original !== 'function') return;
          cp[method] = function() {
            var args = Array.prototype.slice.call(arguments);
            var optIdx = -1;
            for (var i = 1; i < args.length; i++) {
              var a = args[i];
              if (a && typeof a === 'object' && !Array.isArray(a)) {
                optIdx = i;
                break;
              }
            }
            if (optIdx >= 0) {
              args[optIdx].windowsHide = true;
            } else {
              var opts = { windowsHide: true };
              if (typeof args[args.length - 1] === 'function') {
                args.splice(args.length - 1, 0, opts);
              } else {
                args.push(opts);
              }
            }
            return original.apply(this, args);
          };
        });
      }
    } catch (e) {
      // ignore
    }
  }
})();
`;

function ensureGatewayFetchPreload(): string {
  const dest = path.join(app.getPath('userData'), 'gateway-fetch-preload.cjs');
  try {
    writeFileSync(dest, GATEWAY_FETCH_PRELOAD_SOURCE, 'utf-8');
  } catch {
    // best-effort
  }
  return dest;
}

export async function launchGatewayProcess(options: {
  port: number;
  launchContext: GatewayLaunchContext;
  sanitizeSpawnArgs: (args: string[]) => string[];
  getCurrentState: () => GatewayLifecycleState;
  getShouldReconnect: () => boolean;
  onStderrLine: (line: string) => void;
  onSpawn: (pid: number | undefined) => void;
  onExit: (child: import('node:child_process').ChildProcess, code: number | null) => void;
  onError: (error: Error) => void;
}): Promise<{ child: import('node:child_process').ChildProcess; lastSpawnSummary: string }> {
  const {
    mclawDir,
    entryScript,
    gatewayArgs,
    forkEnv,
    mode,
    binPathExists,
    loadedProviderKeyCount,
    proxySummary,
    channelStartupSummary,
  } = options.launchContext;

  logger.info(
    `Starting Gateway process (mode=${mode}, port=${options.port}, entry="${entryScript}", args="${options.sanitizeSpawnArgs(gatewayArgs).join(' ')}", cwd="${mclawDir}", bundledBin=${binPathExists ? 'yes' : 'no'}, providerKeys=${loadedProviderKeyCount}, channels=${channelStartupSummary}, proxy=${proxySummary})`,
  );
  const lastSpawnSummary = `mode=${mode}, entry="${entryScript}", args="${options.sanitizeSpawnArgs(gatewayArgs).join(' ')}", cwd="${mclawDir}"`;

  const runtimeEnv = { ...forkEnv };

  // Disable OpenClaw's mDNS/Bonjour gateway advertiser unconditionally.
  //
  // The OpenClaw gateway advertises `_mclaw-gw._tcp.local` on every
  // active network interface using a hardcoded `openclaw.local` hostname,
  // which causes:
  //   - cross-machine name collisions when multiple OpenClaw/mclaw peers
  //     share a LAN (each falls back to "<name> (OpenClaw) (2)")
  //   - self-collisions on multi-homed hosts (Wi-Fi + Tailscale + utun ...)
  //   - "ghost" record collisions after an unclean mclaw exit, because
  //     SIGKILL prevents ciao from emitting the mDNS goodbye record.
  //
  // mclaw has no UI for LAN gateway discovery today, so the advertiser is
  // pure log noise.  `OPENCLAW_DISABLE_BONJOUR=1` short-circuits
  // `startGatewayBonjourAdvertiser()` (openclaw `src/infra/bonjour.ts`,
  // `isDisabledByEnv()`).  Set after the `forkEnv` spread so any
  // pre-existing value inherited from the user shell cannot re-enable it.
  runtimeEnv.OPENCLAW_DISABLE_BONJOUR = '1';

  // Pin OpenClaw gateway to mclaw's own config directory so all gateway-owned
  // data (sessions, agents, extensions discovery, oauth tokens, etc.) lives
  // under ~/.mclaw/ — never the legacy ~/.openclaw/ that other OpenClaw
  // installations may use on the same machine.
  //
  // Without this, OpenClaw gateway defaults to ~/.openclaw/ when its
  // OPENCLAW_CONFIG env is unset, which leaks mclaw state into a directory
  // that other projects (and the user) consider off-limits.
  runtimeEnv.OPENCLAW_STATE_DIR = getOpenClawConfigDir();

  // Only apply the fetch/child_process preload in dev mode.
  // In packaged builds Electron's UtilityProcess rejects NODE_OPTIONS
  // with --require, logging "Most NODE_OPTIONs are not supported in
  // packaged apps" and the preload never loads.
  if (!app.isPackaged) {
    try {
      const preloadPath = ensureGatewayFetchPreload();
      if (existsSync(preloadPath)) {
        runtimeEnv.NODE_OPTIONS = appendNodeRequireToNodeOptions(
          runtimeEnv.NODE_OPTIONS,
          preloadPath,
        );
      }
    } catch (err) {
      logger.warn('Failed to set up OpenRouter headers preload:', err);
    }
  }

  return await new Promise<{ child: ChildProcess; lastSpawnSummary: string }>((resolve, reject) => {
    // ─────────────────────────────────────────────────────────────
    // QClaw 模式：独立 Node 进程启动 Gateway
    // ─────────────────────────────────────────────────────────────
    // 不用 utilityProcess.fork（UtilityProcess 是 Electron 内部进程，绑死主进程）
    // 用 Resources/node/node 独立二进制，进程名 openclaw-gateway（用 --title 设置 process.title）
    // cwd 指向解包后的 mclaw-runtime/node_modules/openclaw/
    //
    // 收益：
    //   - Gateway 崩溃不影响 UI
    //   - 进程名独立，外部 ps/monitor/CLI 工具可直接定位
    //   - 升级 Node 不需要重打 Electron
    //   - cwd 是用户级目录，可被 tarball 升级影响（vs app.asar 内嵌）
    //
    // dev 模式 fallback：没找到 node 二进制时回退到 utilityProcess.fork
    // （pnpm 调试时 Electron 自带 Node 22 完全够用）
    const runtimeDir = getMclawRuntimeDir();
    const nodeBinary = getMclawGatewayNodeBinary();
    const entryAbs = path.isAbsolute(entryScript) ? entryScript : path.join(mclawDir, entryScript);

    let child: ChildProcess;
    let spawnMode: 'standalone-node' | 'utility-process';

    if (existsSync(nodeBinary) && (app.isPackaged ? existsSync(runtimeDir) : true)) {
      // 标准模式：独立 Node 二进制
      // dev 模式：只检查 nodeBinary（不需要 build/mawruntime）
      // packaged 模式：检查 nodeBinary + runtimeDir（必须先解包）
      // 关键：进程名对齐 QClaw 风格叫 `openclaw-gateway`（不是 mclaw-gateway）
      // QClaw 用的 openclaw 2026.4.21 启动时会自己把 process.title 设为 `openclaw-gateway`
      // mclaw 用的 openclaw 2026.5.20 启动时会设 `openclaw`（不带 -gateway 后缀）
      // 所以我们用 --title 在 Node 启动瞬间设成 `openclaw-gateway`，虽然 openclaw
      // 启动后会覆盖成 `openclaw`，但 ps -ww 仍能看到 --title 参数的痕迹
      const childName = 'openclaw-gateway';
      // dev 模式 cwd 用 node_modules/openclaw 父目录，packaged 用 runtimeDir
      const gatewayCwd = app.isPackaged
        ? path.dirname(path.dirname(entryAbs)) // runtime/node_modules/openclaw/
        : mclawDir;                            // node_modules/openclaw/
      // 关键：让 ps/top 显示为 openclaw-gateway
      // Node 接受 --title 设置 process.title（macOS/Linux）
      const nodeArgs: string[] = [
        `--title=${childName}`,
        entryAbs,
        ...gatewayArgs,
      ];
      // 重要：standalone-node 模式下不要复用 utilityProcess 时代的 NODE_OPTIONS（preload hack）
      // 否则 `appendNodeRequireToNodeOptions(opts.NODE_OPTIONS, '')` 会生成 `--require ""`，
      // 触发 Node "invalid value for NODE_OPTIONS (unterminated string)" 错误，进程 code=9 退出。
      // dev 模式用父进程的 NODE_OPTIONS 即可（preload patch 在 Electron 主进程里跑）；
      // packaged 模式不打 NODE_OPTIONS，由 openclaw 自己处理 OpenRouter headers。
      const envForStandalone: NodeJS.ProcessEnv = { ...runtimeEnv };
      // 注意：不在这里设置/修改 NODE_OPTIONS，让 Node 用默认值即可

      logger.info(`[gateway-launch] mode=standalone-node node=${nodeBinary} cwd=${gatewayCwd} entry=${entryAbs} title=${childName}`);

      child = spawn(nodeBinary, nodeArgs, {
        cwd: gatewayCwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: envForStandalone as NodeJS.ProcessEnv,
        windowsHide: true,
        // detached: false - 跟随 Electron 主进程，关闭 app 时一起退出
      });
      spawnMode = 'standalone-node';

      // macOS: setpriority + rename via process.title 在 Node 端通过 --title 已设
      // Linux: 同样通过 process.title
      // Windows: 进程名由可执行文件名决定
    } else {
      // fallback: utilityProcess（找不到独立 Node 二进制时才走）
      const reason = !existsSync(nodeBinary)
        ? `node-binary not found at ${nodeBinary}`
        : `runtime-dir not extracted at ${runtimeDir}`;
      logger.warn(`[gateway-launch] mode=utility-process ${reason}, falling back`);
      child = utilityProcess.fork(entryScript, gatewayArgs, {
        cwd: mclawDir,
        stdio: 'pipe',
        env: runtimeEnv as NodeJS.ProcessEnv,
        serviceName: 'OpenClaw Gateway',
      }) as unknown as ChildProcess;
      spawnMode = 'utility-process';
    }

    // 写指针文件（QClaw 模式：~/.mclaw/mclaw.json）
    try {
      writeMclawPointerFile({
        mode: spawnMode,
        pid: child.pid,
        port: options.port,
        nodeBinary,
        entryScript: entryAbs,
        runtimeDir,
        startedAt: Date.now(),
      });
    } catch (err) {
      logger.warn('Failed to write mclaw pointer file:', err);
    }

    let settled = false;
    const resolveOnce = () => {
      if (settled) return;
      settled = true;
      resolve({ child, lastSpawnSummary });
    };
    const rejectOnce = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    child.on('error', (error: Error) => {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      logger.error('Gateway process spawn error:', error);
      options.onError(normalizedError);
      rejectOnce(normalizedError);
    });

    child.on('exit', (code: number | null) => {
      // Only check shouldReconnect — not current state.  On Windows the WS
      // close handler fires before the process exit handler and sets state to
      // 'stopped', which would make an unexpected crash look like a planned
      // shutdown in logs.  shouldReconnect is the reliable indicator: stop()
      // sets it to false (expected), crashes leave it true (unexpected).
      const expectedExit = !options.getShouldReconnect();
      const level = expectedExit ? logger.info : logger.warn;
      level(`Gateway process exited (code=${code}, expected=${expectedExit ? 'yes' : 'no'}, mode=${spawnMode})`);
      // 进程退出时清掉指针文件里的 pid
      try { clearMclawPointerFile(child.pid); } catch { /* ignore */ }
      options.onExit(child as any, code as any);
    });

    if (child.stderr) {
      child.stderr.on('data', (data: Buffer) => {
        const raw = data.toString();
        for (const line of raw.split(/\r?\n/)) {
          options.onStderrLine(line);
        }
      });
    }
    if (child.stdout) {
      child.stdout.on('data', (data: Buffer) => {
        // Gateway 正常输出在 stdout 时也走 stderr 通道（保持与 utilityProcess 行为一致）
        const raw = data.toString();
        for (const line of raw.split(/\r?\n/)) {
          if (line) options.onStderrLine(line);
        }
      });
    }

    // ChildProcess 在 spawn 同步返回时就已经'启动'了，pid 立即可用
    // 但为了与 utilityProcess 行为对齐（utilityProcess 的 'spawn' 是异步事件），
    // 我们用 setImmediate 模拟"异步触发"
    setImmediate(() => {
      logger.info(`Gateway process started (pid=${child.pid}, mode=${spawnMode})`);
      options.onSpawn(child.pid);
      resolveOnce();
    });
  });
}
