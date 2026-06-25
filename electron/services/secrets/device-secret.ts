/**
 * Device Secret —— 客户端 HMAC 签名密钥（绑 mclaw 客户端）。
 *
 * 云端模型访问绑定加固（第一期）：只有 mclaw 客户端持有 deviceSecret，
 * 纯 curl 拿 runtime key 也算不出 llmproxy 验签所需的 X-Mclaw-Sig 签名。
 *
 * 存储：用 Electron safeStorage（macOS Keychain / Windows DPAPI / Linux secret-service）
 * 加密后存 userData/device-secret.enc，明文绝不落盘。safeStorage 不可用时（如 Linux 无
 * keyring）退化为明文随机串存文件，安全性降级但保证可用。
 *
 * 流转：
 *   - 主进程 keychain（源头）→ 启动 Gateway 子进程时经 env MCLAW_DEVICE_SECRET 注入算签名
 *   - 主进程 keychain → IPC device-secret:get → 渲染进程提交给后端 IssueRuntimeKey（绑定到 runtime key）
 */
import { app, safeStorage } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { logger } from '../../utils/logger';

const DEVICE_SECRET_FILENAME = 'device-secret.enc';

function deviceSecretPath(): string {
  return path.join(app.getPath('userData'), DEVICE_SECRET_FILENAME);
}

/**
 * getOrCreateDeviceSecret 返回客户端 HMAC 签名密钥。
 * 首次调用生成 64 字符 hex 随机串并加密持久化；后续调用解密读取。
 * 解密失败（换机器/文件损坏）时重新生成。
 */
export function getOrCreateDeviceSecret(): string {
  const file = deviceSecretPath();
  if (existsSync(file)) {
    try {
      const buf = readFileSync(file);
      const plaintext = safeStorage.decryptString(buf);
      if (plaintext) {
        return plaintext;
      }
    } catch (err) {
      logger.warn('[device-secret] decrypt failed, regenerating:', err);
    }
  }

  const secret = randomBytes(32).toString('hex');
  try {
    if (safeStorage.isEncryptionAvailable()) {
      writeFileSync(file, safeStorage.encryptString(secret));
    } else {
      // 降级：safeStorage 不可用（Linux 无 secret-service 等），明文存。
      // 安全性降级——deviceSecret 可被同用户进程读取，但优于完全不可用。
      logger.warn('[device-secret] safeStorage unavailable, storing plaintext (degraded security)');
      writeFileSync(file, Buffer.from(secret, 'utf8'));
    }
  } catch (err) {
    logger.error('[device-secret] failed to persist device secret:', err);
  }
  return secret;
}
