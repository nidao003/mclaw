#!/usr/bin/env node

/**
 * pack-mclaw.cjs
 *
 * mclaw 问题反馈打包脚本（仿 QClaw pack-qclaw.cjs）。
 *
 * 把以下内容打成 ZIP 放桌面，方便用户反馈问题时导出发给老王：
 *   - config/        ← ~/.mclaw 目录内容（排除 node_modules / .git）
 *   - logs/          ← 应用日志（按平台自动识别路径）
 *
 * 日志目录：
 *   - macOS:   ~/Library/Logs/mclaw/
 *   - Windows: %APPDATA%\mclaw\logs\
 *   - Linux:   ~/.config/mclaw/logs/
 *
 * 用法：
 *   1. CLI 直接跑：node scripts/pack-mclaw.cjs [输出路径]
 *   2. Electron IPC 调用：const { packMclaw } = require('./scripts/pack-mclaw.cjs')
 *
 * 实现：纯 Node.js zlib ZIP（mac/win/linux 通用，不依赖系统 zip 命令）
 */

'use strict';

const { existsSync, mkdirSync, statSync, readdirSync, readFileSync, writeFileSync } = require('fs');
const { resolve, dirname, join, basename } = require('path');
const { homedir } = require('os');
const zlib = require('zlib');

// ============================================
// 配置
// ============================================

/** 用户配置目录 ~/.mclaw */
const CONFIG_DIR = resolve(homedir(), '.mclaw');

/** 应用产品名（与 electron-builder 配置一致） */
const APP_NAME = 'mclaw';

/**
 * 获取日志目录路径
 */
function getLogsDir() {
  switch (process.platform) {
    case 'darwin':
      return join(homedir(), 'Library', 'Logs', APP_NAME);
    case 'win32':
      return join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), APP_NAME, 'logs');
    default:
      return join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), APP_NAME, 'logs');
  }
}

const LOGS_DIR = getLogsDir();

/** 打包时需要排除的目录 */
const EXCLUDED_NAMES = new Set(['node_modules', '.git', 'backups']);

// ============================================
// 纯 Node.js ZIP 实现（基于 zlib deflateRaw）
// ============================================

class SimpleZip {
  constructor() {
    /** @type {{ name: Buffer, compressed: Buffer, uncompressed: Buffer, crc32: number, method: number }[]} */
    this.entries = [];
  }

  /**
   * 添加文件到 ZIP
   * @param {string} zipPath - ZIP 内的路径（使用 / 分隔）
   * @param {Buffer} data - 文件内容
   */
  addFile(zipPath, data) {
    const normalizedPath = zipPath.replace(/\\/g, '/');
    const nameBuffer = Buffer.from(normalizedPath, 'utf8');
    const crc = this._crc32(data);

    let compressed;
    let method;

    if (data.length === 0) {
      compressed = data;
      method = 0; // stored
    } else {
      compressed = zlib.deflateRawSync(data, { level: 6 });
      if (compressed.length >= data.length) {
        compressed = data;
        method = 0;
      } else {
        method = 8; // deflated
      }
    }

    this.entries.push({
      name: nameBuffer,
      compressed,
      uncompressed: data,
      crc32: crc,
      method,
    });
  }

  /**
   * 添加目录条目
   */
  addDirectory(zipPath) {
    const normalizedPath = zipPath.replace(/\\/g, '/').replace(/\/?$/, '/');
    const nameBuffer = Buffer.from(normalizedPath, 'utf8');
    this.entries.push({
      name: nameBuffer,
      compressed: Buffer.alloc(0),
      uncompressed: Buffer.alloc(0),
      crc32: 0,
      method: 0,
    });
  }

  toBuffer() {
    const parts = [];
    const centralParts = [];
    let offset = 0;

    for (const entry of this.entries) {
      const localHeader = this._buildLocalFileHeader(entry);
      parts.push(localHeader);
      parts.push(entry.compressed);

      const centralEntry = this._buildCentralDirectoryEntry(entry, offset);
      centralParts.push(centralEntry);

      offset += localHeader.length + entry.compressed.length;
    }

    const centralDirOffset = offset;
    let centralDirSize = 0;
    for (const part of centralParts) {
      parts.push(part);
      centralDirSize += part.length;
    }

    // EOCD
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(this.entries.length, 8);
    eocd.writeUInt16LE(this.entries.length, 10);
    eocd.writeUInt32LE(centralDirSize, 12);
    eocd.writeUInt32LE(centralDirOffset, 16);
    eocd.writeUInt16LE(0, 20);
    parts.push(eocd);

    return Buffer.concat(parts);
  }

  _buildLocalFileHeader(entry) {
    const header = Buffer.alloc(30 + entry.name.length);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x0800, 6);
    header.writeUInt16LE(entry.method, 8);
    header.writeUInt16LE(0, 10);
    header.writeUInt16LE(0, 12);
    header.writeUInt32LE(entry.crc32, 14);
    header.writeUInt32LE(entry.compressed.length, 18);
    header.writeUInt32LE(entry.uncompressed.length, 22);
    header.writeUInt16LE(entry.name.length, 26);
    header.writeUInt16LE(0, 28);
    entry.name.copy(header, 30);
    return header;
  }

  _buildCentralDirectoryEntry(entry, localHeaderOffset) {
    const header = Buffer.alloc(46 + entry.name.length);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(0x0800, 8);
    header.writeUInt16LE(entry.method, 10);
    header.writeUInt16LE(0, 12);
    header.writeUInt16LE(0, 14);
    header.writeUInt32LE(entry.crc32, 16);
    header.writeUInt32LE(entry.compressed.length, 20);
    header.writeUInt32LE(entry.uncompressed.length, 24);
    header.writeUInt16LE(entry.name.length, 28);
    header.writeUInt16LE(0, 30);
    header.writeUInt16LE(0, 32);
    header.writeUInt16LE(0, 34);
    header.writeUInt16LE(0, 36);
    header.writeUInt32LE(0, 38);
    header.writeUInt32LE(localHeaderOffset, 42);
    entry.name.copy(header, 46);
    return header;
  }

  _crc32(buf) {
    if (!SimpleZip._crcTable) {
      const table = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
          c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        table[i] = c;
      }
      SimpleZip._crcTable = table;
    }

    const table = SimpleZip._crcTable;
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
}
SimpleZip._crcTable = undefined;

// ============================================
// 工具函数
// ============================================

function formatDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getDesktopPath() {
  try {
    const { app } = require('electron');
    return app.getPath('desktop');
  } catch {
    return join(homedir(), 'Desktop');
  }
}

function addDirToZip(zip, dirPath, zipPrefix, excludedNames = EXCLUDED_NAMES) {
  if (!existsSync(dirPath)) return;

  let entries;
  try {
    entries = readdirSync(dirPath, { withFileTypes: true });
  } catch (err) {
    console.warn(`[pack-mclaw] ⚠️  读取目录失败: ${dirPath} (${err.message})`);
    return;
  }

  for (const entry of entries) {
    if (excludedNames.has(entry.name)) continue;
    const fullPath = join(dirPath, entry.name);
    try {
      if (entry.isDirectory()) {
        addDirToZip(zip, fullPath, `${zipPrefix}${entry.name}/`, excludedNames);
      } else if (entry.isFile()) {
        const data = readFileSync(fullPath);
        zip.addFile(`${zipPrefix}${entry.name}`, data);
      }
    } catch (err) {
      console.warn(`[pack-mclaw] ⚠️  处理文件失败: ${fullPath} (${err.message})`);
    }
  }
}

// ============================================
// 核心打包函数
// ============================================

async function packMclaw(outputPath) {
  const desktopPath = getDesktopPath();
  const timestamp = formatDate(new Date());

  const outputFile = outputPath
    ? resolve(outputPath)
    : resolve(desktopPath, `mclaw-feedback-${timestamp}.zip`);

  console.log('\n[pack-mclaw] 🔧 开始打包问题反馈数据 ...');
  console.log(`[pack-mclaw] 配置目录：${CONFIG_DIR}${existsSync(CONFIG_DIR) ? '' : ' (不存在)'}`);
  console.log(`[pack-mclaw] 日志目录：${LOGS_DIR}${existsSync(LOGS_DIR) ? '' : ' (不存在)'}`);
  console.log(`[pack-mclaw] 输出文件：${outputFile}`);

  if (!existsSync(CONFIG_DIR) && !existsSync(LOGS_DIR)) {
    throw new Error(
      `配置目录和日志目录都不存在：\n  配置：${CONFIG_DIR}\n  日志：${LOGS_DIR}`,
    );
  }

  const outputDir = dirname(outputFile);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    console.log(`[pack-mclaw] 已创建输出目录：${outputDir}`);
  }

  console.log('[pack-mclaw] 正在收集文件...\n');

  const zip = new SimpleZip();

  if (existsSync(CONFIG_DIR)) {
    console.log('[pack-mclaw]   📁 复制配置文件 ...');
    addDirToZip(zip, CONFIG_DIR, 'config/');
  } else {
    console.log('[pack-mclaw]   ⚠️  配置目录不存在，跳过');
  }

  if (existsSync(LOGS_DIR)) {
    console.log('[pack-mclaw]   📁 复制日志文件 ...');
    addDirToZip(zip, LOGS_DIR, 'logs/');
  } else {
    console.log('[pack-mclaw]   ⚠️  日志目录不存在，跳过');
  }

  console.log('[pack-mclaw]   📦 正在压缩 ...\n');
  const zipBuffer = zip.toBuffer();
  writeFileSync(outputFile, zipBuffer);

  if (!existsSync(outputFile)) {
    throw new Error('压缩完成但输出文件未生成');
  }

  const size = statSync(outputFile).size;
  const sizeFormatted = formatBytes(size);

  console.log(`[pack-mclaw] ✅ 打包完成！`);
  console.log(`[pack-mclaw] 文件路径：${outputFile}`);
  console.log(`[pack-mclaw] 文件大小：${sizeFormatted}\n`);

  return { outputFile, size, sizeFormatted };
}

// ============================================
// 导出（供 Electron IPC 调用）
// ============================================

module.exports = { packMclaw };

// ============================================
// CLI 入口
// ============================================

if (require.main === module) {
  const outputArg = process.argv[2];
  packMclaw(outputArg).catch((err) => {
    console.error(`\n[pack-mclaw] 打包失败：${err.message}`);
    process.exit(1);
  });
}
