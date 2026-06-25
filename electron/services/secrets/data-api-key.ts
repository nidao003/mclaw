/**
 * Data API Key —— 数据查询接口凭证（mclaw Go 后端 /api/v1/data/* 的 X-API-Key）。
 *
 * 与 deviceSecret（大模型签名密钥，绑 mclaw 客户端）不同：数据 API key **不绑客户端**，
 * 本身是通用 X-API-Key 鉴权，用户拿出来能在 Postman/curl/其他 OpenClaw 里直接用。
 * 安全靠"明文不落 openclaw.json"——只进 keychain，拿配置文件白嫖不了。
 *
 * 存储：用 Electron safeStorage（macOS Keychain / Windows DPAPI / Linux secret-service）
 * 加密后存 userData/data-api-key.enc，明文绝不落盘。safeStorage 不可用时退化为明文存
 * （安全性降级但保证可用，与 device-secret.ts 同策略）。
 *
 * 流转：
 *   - 主进程 keychain（源头）→ 启动 Gateway 子进程时经 env MCLAW_DATA_API_KEY 注入，供 skill 脚本读取
 *   - 渲染进程经 IPC data-api-key:get/save/clear 读写（ensureDataApiKey 严谨流程用）
 */
import { app, safeStorage } from 'electron';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { logger } from '../../utils/logger';

const DATA_API_KEY_FILENAME = 'data-api-key.enc';

function dataApiKeyPath(): string {
  return path.join(app.getPath('userData'), DATA_API_KEY_FILENAME);
}

/**
 * getDataApiKey 从 keychain 解密读取数据 API key。
 * 没有文件或解密失败返回 null（触发上层 ensureDataApiKey 重建流程）。
 */
export function getDataApiKey(): string | null {
  const file = dataApiKeyPath();
  if (!existsSync(file)) {
    return null;
  }
  try {
    const buf = readFileSync(file);
    const plaintext = safeStorage.decryptString(buf);
    return plaintext || null;
  } catch (err) {
    logger.warn('[data-api-key] decrypt failed, treating as missing:', err);
    return null;
  }
}

/**
 * saveDataApiKey 加密持久化数据 API key 到 keychain。
 */
export function saveDataApiKey(key: string): void {
  if (!key) {
    logger.warn('[data-api-key] empty key, ignoring save');
    return;
  }
  const file = dataApiKeyPath();
  try {
    if (safeStorage.isEncryptionAvailable()) {
      writeFileSync(file, safeStorage.encryptString(key));
    } else {
      // 降级：safeStorage 不可用（Linux 无 secret-service 等），明文存。
      logger.warn('[data-api-key] safeStorage unavailable, storing plaintext (degraded security)');
      writeFileSync(file, Buffer.from(key, 'utf8'));
    }
  } catch (err) {
    logger.error('[data-api-key] failed to persist data api key:', err);
  }
}

/**
 * clearDataApiKey 删除 keychain 里的数据 API key（失效重建前调用）。
 */
export function clearDataApiKey(): void {
  const file = dataApiKeyPath();
  if (!existsSync(file)) {
    return;
  }
  try {
    unlinkSync(file);
  } catch (err) {
    logger.warn('[data-api-key] failed to clear data api key:', err);
  }
}
