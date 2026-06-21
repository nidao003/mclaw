#!/usr/bin/env zx

/**
 * 下载 mclaw-gateway 独立 Node.js 运行时二进制。
 *
 * 为什么 mclaw 需要自带 Node（而不是复用 Electron 的 Node）：
 *   1. QClaw 的模式：QClaw.app/Resources/node/node 是独立二进制（v22.16.0），
 *      启动 openclaw-gateway 子进程时用这个独立 Node，而不是 utilityProcess。
 *      进程名固定为 openclaw-gateway，cwd 指向解包后的 openclaw 目录。
 *   2. 收益：Gateway 与 Electron 主进程彻底解耦，崩溃不影响 UI；
 *      进程名独立便于监控；可以独立升级 Node 版本。
 *
 * 解压目标：
 *   macOS:   resources/bin/darwin-{arch}/node
 *   Windows: resources/bin/win32-{arch}/node.exe
 *   Linux:   resources/bin/linux-{arch}/node
 *
 * 与 mclaw 主版本绑定的 Node 版本（参考 QClaw 0.2.25 + Electron 37）：
 *   - Electron 40.x 内置 Node 22.x
 *   - 独立 Node 22.16.0 LTS（与 QClaw 一致），保证 ABI 兼容
 */

import 'zx/globals';

const ROOT_DIR = path.resolve(__dirname, '..');
const NODE_VERSION = '22.16.0';
const BASE_URL = `https://nodejs.org/dist/v${NODE_VERSION}`;
const OUTPUT_BASE = path.join(ROOT_DIR, 'resources', 'bin');

/**
 * 平台目标定义。
 * macOS 和 Linux 用 tar.gz（Node 官方分发），Windows 用 zip。
 */
const TARGETS = {
  'darwin-x64': {
    filename: `node-v${NODE_VERSION}-darwin-x64.tar.gz`,
    sourceDir: `node-v${NODE_VERSION}-darwin-x64`,
    binaryName: 'node',
    archiveType: 'tar',
  },
  'darwin-arm64': {
    filename: `node-v${NODE_VERSION}-darwin-arm64.tar.gz`,
    sourceDir: `node-v${NODE_VERSION}-darwin-arm64`,
    binaryName: 'node',
    archiveType: 'tar',
  },
  'linux-x64': {
    filename: `node-v${NODE_VERSION}-linux-x64.tar.gz`,
    sourceDir: `node-v${NODE_VERSION}-linux-x64`,
    binaryName: 'node',
    archiveType: 'tar',
  },
  'linux-arm64': {
    filename: `node-v${NODE_VERSION}-linux-arm64.tar.gz`,
    sourceDir: `node-v${NODE_VERSION}-linux-arm64`,
    binaryName: 'node',
    archiveType: 'tar',
  },
  'win32-x64': {
    filename: `node-v${NODE_VERSION}-win-x64.zip`,
    sourceDir: `node-v${NODE_VERSION}-win-x64`,
    binaryName: 'node.exe',
    archiveType: 'zip',
  },
  'win32-arm64': {
    filename: `node-v${NODE_VERSION}-win-arm64.zip`,
    sourceDir: `node-v${NODE_VERSION}-win-arm64`,
    binaryName: 'node.exe',
    archiveType: 'zip',
  },
};

const PLATFORM_GROUPS = {
  mac: ['darwin-x64', 'darwin-arm64'],
  win: ['win32-x64', 'win32-arm64'],
  linux: ['linux-x64', 'linux-arm64'],
};

/**
 * 解压 tar.gz 到指定目录（纯 Node.js 实现，不依赖系统 tar）。
 * QClaw 用法：解压到 resources/openclaw/ 下。
 */
async function extractTarGz(archivePath, destDir) {
  // 优先用系统 tar（macOS/Linux 自带）
  if (process.platform !== 'win32') {
    await $`tar -xzf ${archivePath} -C ${destDir}`;
    return;
  }
  // Windows fallback：用 Node 的 tar 包（如果项目里有了就用）
  try {
    const tar = await import('tar');
    await tar.extract({ file: archivePath, cwd: destDir });
  } catch {
    // 最后用 PowerShell 的 tar（Windows 10 1803+ 自带 bsdtar）
    await $`tar -xzf ${archivePath} -C ${destDir}`;
  }
}

async function extractZip(archivePath, destDir) {
  if (process.platform === 'win32') {
    const { execFileSync } = await import('child_process');
    const psCommand = `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${archivePath.replace(/'/g, "''")}', '${destDir.replace(/'/g, "''")}')`;
    execFileSync('powershell.exe', ['-NoProfile', '-Command', psCommand], { stdio: 'inherit' });
  } else {
    await $`unzip -q -o ${archivePath} -d ${destDir}`;
  }
}

async function setupTarget(id) {
  const target = TARGETS[id];
  if (!target) {
    echo(chalk.yellow`⚠️  Target ${id} is not supported by this script.`);
    return;
  }

  const targetDir = path.join(OUTPUT_BASE, id);
  const tempDir = path.join(ROOT_DIR, `temp_node_extract_${id.replace(/-/g, '_')}`);
  const archivePath = path.join(ROOT_DIR, target.filename);
  const downloadUrl = `${BASE_URL}/${target.filename}`;
  const outputBinary = path.join(targetDir, target.binaryName);

  echo(chalk.blue`\n📦 Setting up Node.js ${NODE_VERSION} for ${id}...`);

  // 只删目标 binary 文件，不删整个目录（保留同目录下的 uv、agent-browser 等其他二进制）
  if (await fs.pathExists(outputBinary)) {
    await fs.remove(outputBinary);
  }
  await fs.remove(tempDir);
  await fs.ensureDir(targetDir);
  await fs.ensureDir(tempDir);

  try {
    echo`⬇️  Downloading: ${downloadUrl}`;
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error(`Failed to download: ${response.statusText}`);
    const buffer = await response.arrayBuffer();
    await fs.writeFile(archivePath, Buffer.from(buffer));

    echo`📂 Extracting ${target.archiveType} archive...`;
    if (target.archiveType === 'tar') {
      await extractTarGz(archivePath, tempDir);
    } else {
      await extractZip(archivePath, tempDir);
    }

    // Node 官方 tar.gz 结构：node-v22.16.0-{platform}-{arch}/bin/node
    const expectedBinary = path.join(tempDir, target.sourceDir, 'bin', target.binaryName);
    if (await fs.pathExists(expectedBinary)) {
      await fs.move(expectedBinary, outputBinary, { overwrite: true });
    } else {
      echo(chalk.yellow`🔍 ${target.binaryName} not found at expected path, searching...`);
      const pattern = `**/${target.binaryName}`;
      const files = await glob(pattern, { cwd: tempDir, absolute: true });
      if (files.length > 0) {
        await fs.move(files[0], outputBinary, { overwrite: true });
      } else {
        throw new Error(`Could not find ${target.binaryName} in extracted files.`);
      }
    }

    // 设置可执行权限（macOS/Linux 必需）
    if (process.platform !== 'win32') {
      await fs.chmod(outputBinary, 0o755);
    }

    echo(chalk.green`✅ Success: ${outputBinary}`);
  } finally {
    await fs.remove(archivePath);
    await fs.remove(tempDir);
  }
}

const downloadAll = argv.all;
const platform = argv.platform;

if (downloadAll) {
  echo(chalk.cyan`🌐 Downloading Node.js ${NODE_VERSION} binaries for all platforms...`);
  for (const id of Object.keys(TARGETS)) {
    await setupTarget(id);
  }
} else if (platform) {
  const targets = PLATFORM_GROUPS[platform];
  if (!targets) {
    echo(chalk.red`❌ Unknown platform: ${platform}`);
    echo(`Available platforms: ${Object.keys(PLATFORM_GROUPS).join(', ')}`);
    process.exit(1);
  }
  echo(chalk.cyan`🎯 Downloading Node.js ${NODE_VERSION} binaries for platform: ${platform}`);
  for (const id of targets) {
    await setupTarget(id);
  }
} else {
  const currentId = `${os.platform()}-${os.arch()}`;
  if (TARGETS[currentId]) {
    echo(chalk.cyan`💻 Detected current system: ${currentId}`);
    await setupTarget(currentId);
  } else {
    echo(chalk.cyan`🎯 Current system ${currentId} not in target list, downloading Windows multi-arch as fallback`);
    for (const id of PLATFORM_GROUPS.win) {
      await setupTarget(id);
    }
  }
}

echo(chalk.green`\n🎉 Done!`);
