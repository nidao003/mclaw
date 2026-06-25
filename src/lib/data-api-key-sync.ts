/**
 * 数据 API key 严谨管理 —— 登录后确保本地 keychain 有一把有效的数据查询 key。
 *
 * 与大模型 runtime key（绑 mclaw + HMAC 签名）不同：数据 API key **不绑客户端**，是通用
 * X-API-Key 鉴权，用户可在 mclaw 外直接用。安全靠"明文只进 keychain，不落 openclaw.json"。
 *
 * 严谨流程（避免积累同名 key + 感知失效）：
 *   1. keychain 有 key → list 比对 key_prefix，有效(is_active)则直接用；失效则 clear 重建
 *   2. keychain 无 key/重建 → list 查同名，逐个 revoke 清理，再 create 拿明文存 keychain
 *
 * key_prefix 为 key 前 16 位（"mclaw_" + 10 hex），List 返回的 ApiKeyDetail.key_prefix 同口径。
 */
import { apiKeyApi } from '@mclaw/shared';
import { DATA_API_KEY_NAME } from './data-api-key-constants';

const KEY_PREFIX_LEN = 16;

function bridge() {
  const b = window.mclaw?.dataApiKey;
  if (!b) {
    throw new Error('data-api-key bridge unavailable');
  }
  return b;
}

/**
 * ensureDataApiKey 确保本地 keychain 有一把有效数据 API key，返回明文（仅供调试/日志，不持久化在渲染层）。
 * 失败抛异常，调用方 catch 后不阻断主流程。
 */
export async function ensureDataApiKey(): Promise<string | null> {
  const b = bridge();

  // 1. keychain 有 key → 验证有效性
  const existing = await b.get();
  if (existing) {
    const { keys } = await apiKeyApi.list();
    const prefix = existing.slice(0, KEY_PREFIX_LEN);
    const match = keys.find((k) => k.key_prefix === prefix);
    if (match && match.is_active) {
      // keychain 这把仍有效，直接用
      return existing;
    }
    // 失效（被用户在 web 后台 revoke 了）→ 清理本地，走重建
    await b.clear();
  }

  // 2. 重建：先清理同名旧 key（避免积累），再 create
  const { keys } = await apiKeyApi.list();
  const sameName = keys.filter((k) => k.name === DATA_API_KEY_NAME);
  for (const k of sameName) {
    try {
      await apiKeyApi.revoke(k.id);
    } catch (err) {
      // 单个 revoke 失败不阻断，继续
      console.warn('[ensureDataApiKey] revoke stale key failed:', k.id, err);
    }
  }

  const resp = await apiKeyApi.create({ name: DATA_API_KEY_NAME });
  await b.save(resp.key);
  return resp.key;
}
