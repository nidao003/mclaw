#!/usr/bin/env node

/**
 * unpack-mclaw.cjs
 *
 * mclaw 启动时解包运行时（仿 QClaw unpack-openclaw.cjs）。
 *
 * 流程：
 *   1. 读 ~/.mclaw/openclaw/.runtime-version.json（上次解包的版本）
 *   2. 读 mawruntime-manifest.json（当前包内的版本）
 *   3. 对比：
 *      - 同版本 + SHA256 匹配 → skip
 *      - 版本不同或损坏 → 解包新版本到 .pending-update/，原子替换
 *   4. 处理 .pending-cleanup/（上一次的旧版本，重命名后用 fs.rm 删）
 *
 * 解包目标：
 *   macOS:   ~/Library/Application Support/mclaw/openclaw/
 *   Windows: %APPDATA%/mclaw/openclaw/
 *   Linux:   ~/.config/mclaw/openclaw/
 *
 * tar 文件来源（QClaw 模式）：
 *   - macOS:   /Applications/mclaw.app/Contents/Resources/mawruntime/mawruntime.tar.gz
 *   - Windows: <install_dir>/resources/mawruntime/mawruntime.tar.gz
 *   - Linux:   /opt/mclaw/resources/mawruntime/mawruntime.tar.gz
 *
 * 用法：
 *   node unpack-mclaw.cjs [--tar <path>] [--target <dir>] [--force]
 *   不带参数时：自动从 process.resourcesPath 或 __dirname 找 tar
 *
 * 依赖：tar（Node.js 18+ 内置）或系统 tar（macOS/Linux/Windows 10+ 都自带）
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const crypto = require('crypto');

// ────────────────────────────────────────────────────────────────
// 参数解析
// ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let argTar = null;
let argTarget = null;
let argForce = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--tar' && i + 1 < args.length) argTar = args[++i];
  else if (args[i] === '--target' && i + 1 < args.length) argTarget = args[++i];
  else if (args[i] === '--force') argForce = true;
  else if (args[i] === '--help' || args[i] === '-h') {
    console.log('Usage: node unpack-mclaw.cjs [--tar <path>] [--target <dir>] [--force]');
    process.exit(0);
  }
}

// ────────────────────────────────────────────────────────────────
// 路径解析
// ────────────────────────────────────────────────────────────────

/**
 * 解包目标目录 = 用户级的 mclaw App Support / config 目录
 * 关键：跟 Electron app.getPath('userData') 保持一致
 *   macOS:   ~/Library/Application Support/mclaw/openclaw/
 *   Windows: %APPDATA%/mclaw/openclaw/
 *   Linux:   ~/.config/mclaw/openclaw/
 */
function getMclawUserDataDir() {
  // 1) 优先用 Electron 提供的 userData（MCLAW_USER_DATA_DIR 环境变量可覆盖）
  if (process.env.MCLAW_USER_DATA_DIR && process.env.MCLAW_USER_DATA_DIR.trim()) {
    return process.env.MCLAW_USER_DATA_DIR.trim();
  }
  // 2) 否则按平台推算
  const home = os.homedir();
  switch (process.platform) {
    case 'darwin':
      return path.join(home, 'Library', 'Application Support', 'mclaw');
    case 'win32': {
      const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
      return path.join(appData, 'mclaw');
    }
    default: {
      // Linux: XDG 规范
      const xdg = process.env.XDG_CONFIG_HOME || path.join(home, '.config');
      return path.join(xdg, 'mclaw');
    }
  }
}

/**
 * tar 包搜索路径（按优先级）：
 *   1. 命令行 --tar
 *   2. process.resourcesPath/mawruntime/mawruntime.tar.gz（Electron 打包模式）
 *   3. 脚本同目录的上两级/resources/mawruntime/mawruntime.tar.gz（dev 模式）
 */
function findTarball() {
  if (argTar) return argTar;

  const candidates = [
    // 命令行指定优先级最高（--tar）
    // 1) build/mclaw-runtime.tar.gz（pnpm build 后由 bundle-openclaw.mjs 生成的真实文件名）
    path.join(__dirname, '..', 'build', 'mclaw-runtime.tar.gz'),
    // 2) build/mawruntime.tar.gz（早期命名兼容）
    path.join(__dirname, '..', 'build', 'mawruntime.tar.gz'),
    // 3) Electron 打包模式：resources/mawruntime/mawruntime.tar.gz
    process.resourcesPath && path.join(process.resourcesPath, 'mawruntime', 'mawruntime.tar.gz'),
    // 4) Electron 打包模式（连字符命名）：resources/mawruntime/mclaw-runtime.tar.gz
    process.resourcesPath && path.join(process.resourcesPath, 'mawruntime', 'mclaw-runtime.tar.gz'),
    // 5) dev 模式：脚本在 scripts/，资源在 ../resources/
    path.join(__dirname, '..', 'resources', 'mawruntime', 'mawruntime.tar.gz'),
    // 6) Mac .app/Contents/Resources/mawruntime/mawruntime.tar.gz（绕过 process.resourcesPath）
    process.resourcesPath && path.join(path.dirname(process.resourcesPath), 'mawruntime', 'mawruntime.tar.gz'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch { /* ignore */ }
  }
  return null;
}

// ────────────────────────────────────────────────────────────────
// 工具
// ────────────────────────────────────────────────────────────────

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function rmSafe(target) {
  try {
    const stat = fs.lstatSync(target);
    if (stat.isDirectory()) {
      fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    } else {
      fs.unlinkSync(target);
    }
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    return false;
  }
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}G`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}M`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${bytes}B`;
}

function log(level, msg) {
  const prefix = `[unpack-mclaw]`;
  if (level === 'error') console.error(`${prefix} ❌ ${msg}`);
  else if (level === 'warn') console.warn(`${prefix} ⚠️  ${msg}`);
  else if (level === 'info') console.log(`${prefix} ${msg}`);
  else console.log(`${prefix} ${msg}`);
}

// ────────────────────────────────────────────────────────────────
// 版本对比
// ────────────────────────────────────────────────────────────────

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function sha256OfFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/**
 * 决定要不要重新解包：
 *   1. target 目录不存在 → 需要
 *   2. 旧版 .runtime-version.json 缺失或损坏 → 需要
 *   3. 版本字段与新 manifest 不一致 → 需要
 *   4. SHA256 与新 manifest 不一致 → 需要（文件损坏）
 *   5. 都不匹配 → 跳过
 */
async function shouldExtract(targetDir, manifest) {
  if (argForce) {
    log('info', '强制重新解包 (--force)');
    return true;
  }

  if (!fs.existsSync(targetDir)) {
    log('info', `目标目录不存在：${targetDir}`);
    return true;
  }

  const versionFile = path.join(targetDir, '.runtime-version.json');
  const currentMeta = readJsonSafe(versionFile);
  if (!currentMeta) {
    log('info', '目标目录缺少 .runtime-version.json（首次启动或被破坏）');
    return true;
  }

  if (currentMeta.openclawVersion !== manifest.openclawVersion) {
    log('info', `openclaw 版本不匹配: ${currentMeta.openclawVersion} → ${manifest.openclawVersion}`);
    return true;
  }

  if (currentMeta.mclawVersion !== manifest.mclawVersion) {
    log('info', `mclaw 版本不匹配: ${currentMeta.mclawVersion} → ${manifest.mclawVersion}`);
    return true;
  }

  // 校验 SHA256（如果有）
  if (manifest.tarballSha256) {
    const tarballPath = manifest.tarball
      ? path.join(targetDir, '..', '..', 'mawruntime', manifest.tarball)
      : null;
    if (tarballPath && fs.existsSync(tarballPath)) {
      const actual = await sha256OfFile(tarballPath);
      if (actual !== manifest.tarballSha256) {
        log('info', `tarball SHA256 不匹配，需要重新解包`);
        return true;
      }
    }
  }

  return false;
}

// ────────────────────────────────────────────────────────────────
// 解包
// ────────────────────────────────────────────────────────────────

/**
 * 用系统 tar（macOS/Linux/Windows 10+ 都自带）解包。
 * tar -xzf <tar> -C <dir> 即可。
 */
function extractTar(tarballPath, destDir) {
  log('info', `解包 ${tarballPath} → ${destDir}`);

  // Windows 10 1803+ 自带 bsdtar，调用 tar 命令就行
  // macOS / Linux 也有 tar
  const result = spawnSync('tar', ['-xzf', tarballPath, '-C', destDir], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    const errMsg = result.stderr ? result.stderr.toString() : 'unknown error';
    throw new Error(`tar 退出码 ${result.status}: ${errMsg}`);
  }
}

/**
 * 解包策略：
 *   1. 解到 <targetDirParent>/.mawruntime-pending/<random>/
 *   2. 原子 rename 到 <targetDirParent>/mawruntime-new/
 *   3. 把旧 <targetDir>/ 改名为 <targetDirParent>/.mawruntime-cleanup-<random>/
 *      （保留以便用户手动回滚，QClaw 的 .pending-cleanup 机制）
 *   4. rename <targetDirParent>/mawruntime-new/ → <targetDir>/
 *   5. 异步清 .mawruntime-cleanup-*（不阻塞启动）
 */
async function extractAtomically(tarballPath, targetDir) {
  const parent = path.dirname(targetDir);
  const baseName = path.basename(targetDir);
  const random = crypto.randomBytes(4).toString('hex');
  const pendingDir = path.join(parent, `.mawruntime-pending-${random}`);
  const newDir = path.join(parent, `${baseName}-new-${random}`);

  ensureDir(parent);
  ensureDir(pendingDir);

  // 1) 解到 pendingDir（会得到 mawruntime/<contents>，因为 tar 里有顶层目录）
  //    tar -xzf 自动重建 tar 里的目录树
  extractTar(tarballPath, pendingDir);

  // 找到 tar 包里的顶层目录（应当是 mawruntime 或 mclaw-runtime）
  const entries = fs.readdirSync(pendingDir);
  if (entries.length !== 1) {
    throw new Error(`tar 包结构异常：期望 1 个顶层目录，找到 ${entries.length} 个`);
  }
  const extractedRoot = path.join(pendingDir, entries[0]);

  // 2) 原子 rename 到 <targetDir>-new-<random>
  fs.renameSync(extractedRoot, newDir);

  // 3) 把旧 targetDir 移到 cleanup 目录（如果存在）
  if (fs.existsSync(targetDir)) {
    const cleanupDir = path.join(parent, `.mawruntime-cleanup-${random}`);
    try {
      fs.renameSync(targetDir, cleanupDir);
      // 异步清理
      setImmediate(() => {
        try {
          rmSafe(cleanupDir);
          log('info', `已清理旧版运行时：${cleanupDir}`);
        } catch (err) {
          log('warn', `清理旧版失败：${err.message}`);
        }
      });
    } catch (err) {
      // 移动旧版失败，rollback
      rmSafe(newDir);
      throw new Error(`移动旧版 ${targetDir} 失败：${err.message}`);
    }
  }

  // 4) 把新版 rename 到 targetDir
  fs.renameSync(newDir, targetDir);

  // 5) 清理 pending 目录（如果还残留）
  rmSafe(pendingDir);
}

// ────────────────────────────────────────────────────────────────
// 主流程
// ────────────────────────────────────────────────────────────────

async function main() {
  const startedAt = Date.now();

  // 1. 找 tar 包
  const tarballPath = findTarball();
  if (!tarballPath) {
    log('error', '找不到 mawruntime.tar.gz（用 --tar 指定，或确认 resources/mawruntime/ 存在）');
    process.exit(1);
  }
  const tarballSize = fs.statSync(tarballPath).size;
  log('info', `找到 tarball: ${tarballPath} (${formatBytes(tarballSize)})`);

  // 2. 读 manifest（同时支持 mawruntime- 和 mclaw-runtime- 两种命名，向后兼容）
  const manifestDir = path.dirname(tarballPath);
  const manifestCandidates = [
    path.join(manifestDir, 'mawruntime-manifest.json'),
    path.join(manifestDir, 'mclaw-runtime-manifest.json'),
  ];
  let manifest = null;
  for (const p of manifestCandidates) {
    manifest = readJsonSafe(p);
    if (manifest) { log('info', `manifest loaded from ${p}`); break; }
  }
  if (!manifest) {
    manifest = {
      tarball: path.basename(tarballPath),
      tarballSize,
      openclawVersion: 'unknown',
      mclawVersion: 'unknown',
      bundledAt: 0,
    };
    log('warn', `manifest not found in ${manifestDir}, using defaults (will always re-extract)`);
  }
  log('info', `manifest: openclaw=${manifest.openclawVersion} mclaw=${manifest.mclawVersion}`);

  // 3. 决定 target dir
  const userDataDir = getMclawUserDataDir();
  const targetDir = argTarget || path.join(userDataDir, 'openclaw');
  log('info', `解包目标: ${targetDir}`);

  // 4. 决定要不要解包
  if (!(await shouldExtract(targetDir, manifest))) {
    log('info', '✅ 运行时已是最新版本，跳过解包');
    process.exit(0);
  }

  // 5. 原子解包
  try {
    await extractAtomically(tarballPath, targetDir);
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    const finalSize = (() => {
      try {
        let total = 0;
        const stack = [targetDir];
        while (stack.length > 0) {
          const d = stack.pop();
          for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            const p = path.join(d, e.name);
            if (e.isDirectory()) stack.push(p);
            else total += fs.statSync(p).size;
          }
        }
        return total;
      } catch { return 0; }
    })();
    log('info', `✅ 解包完成 (${formatBytes(finalSize)}, ${elapsed}s)`);
    log('info', `   openclaw: ${manifest.openclawVersion}`);
    log('info', `   mclaw:    ${manifest.mclawVersion}`);
    process.exit(0);
  } catch (err) {
    log('error', `解包失败: ${err.message}`);
    log('error', '  提示: 用户可以手动删除 targetDir 后重试');
    process.exit(1);
  }
}

main().catch((err) => {
  log('error', err.stack || err.message);
  process.exit(1);
});
