/**
 * Cloud Model → OpenClaw ProviderAccount Synchronization
 *
 * Bridges backend Model entities to local OpenClaw ProviderAccount entries.
 * This module provides pure mapping functions and a sync workflow.
 */

import type { Model } from '@mclaw/shared/types/model';
import type {
  ProviderAccount,
  ProviderType,
} from '@/lib/providers';
import { hostApi } from '@/lib/host-api';
import { modelsApi } from '@mclaw/shared';

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error thrown when cloud model sync fails.
 */
export class CloudSyncError extends Error {
  readonly modelId: string;
  readonly vendorId: string;
  readonly originalMessage: string;

  constructor(params: {
    modelId: string;
    vendorId: string;
    originalMessage: string;
  }) {
    super(`[CloudSync] Failed to sync model ${params.modelId} (vendor: ${params.vendorId}): ${params.originalMessage}`);
    this.name = 'CloudSyncError';
    this.modelId = params.modelId;
    this.vendorId = params.vendorId;
    this.originalMessage = params.originalMessage;
    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CloudSyncError);
    }
  }
}

// ============================================================================
// Vendor Mapping
// ============================================================================

/**
 * Maps backend Model.provider string to OpenClaw ProviderType.
 * This is exhaustive - unknown providers fall back to 'custom'.
 */
const BACKEND_VENDOR_TO_OPENCLAW: Record<string, ProviderType> = {
  OpenAI: 'openai',
  Anthropic: 'anthropic',
  Google: 'google',
  Gemini: 'google',
  SiliconFlow: 'siliconflow',
  DeepSeek: 'deepseek',
  Moonshot: 'moonshot',
  AzureOpenAI: 'custom',
  BaiZhiCloud: 'custom',
  BaiLian: 'custom',
  Hunyuan: 'custom',
  Volcengine: 'custom',
  Ollama: 'ollama',
  Other: 'custom',
} as const;

/**
 * Resolves the backend provider string to an OpenClaw ProviderType.
 */
export function resolveVendorForCloudModel(model: Model): ProviderType {
  const vendor = BACKEND_VENDOR_TO_OPENCLAW[model.provider];
  if (vendor) {
    return vendor;
  }
  // Exhaustiveness check - any unknown provider falls to custom
  return 'custom';
}

// ============================================================================
// Runtime Provider Key（与 electron getOpenClawProviderKey 对齐）
// ============================================================================

/**
 * 推导一个云端模型在 OpenClaw 运行时（openclaw.json / token usage 记录）里的 provider key。
 *
 * 云端模型 vendorId 固定 'custom'，account id = `cloud-${model.id}`。
 * OpenClaw 对未注册类型（custom）的 runtime key 派生规则：
 *   `custom-` + accountId 去掉所有连字符后取前 8 位
 * 例：model.id=b8c63adc-884e-... → accountId=cloud-b8c63adc-... → runtime key=custom-cloudb8c
 *
 * 这里的推导必须与 electron/services/providers/provider-runtime-sync.ts 的 getOpenClawProviderKey
 * 保持一致，否则 token usage 来源分类（cloud/local）会判错。
 */
export function resolveCloudRuntimeProviderKey(model: Pick<Model, 'id'>): string {
  const accountId = `cloud-${model.id}`;
  const suffix = accountId.replace(/-/g, '').slice(0, 8);
  return `custom-${suffix}`;
}

// ============================================================================
// Protocol Mapping
// ============================================================================

// ============================================================================
// Pure Mapping Function
// ============================================================================

/**
 * 后端 llmproxy 的公网入口（OpenClaw Gateway 是用户本地进程，不走 Vite proxy，
 * 必须直连后端公网地址）。dev/prod 都用此地址。
 */
const LLMPROXY_BASE_URL =
  import.meta.env.VITE_LLMPROXY_BASE_URL || 'https://[REDACTED]/v1';

/**
 * Maps a backend Model to an OpenClaw ProviderAccount.
 *
 * 云端模型统一走 Go 后端 llmproxy 转发（不直连大模型）：
 * - vendorId 固定 'custom'，baseUrl 指向后端 llmproxy
 * - api_key 用后端签发的 runtime key（见 syncCloudModelAsProviderAccount），非模型明文 key
 * - model 用后端 Model.model 字段（llmproxy 用 runtime key 解析模型，请求体 model 字段须与之一致）
 *
 * NOTE: This is a pure mapping - no API calls are made.
 * The apiKey is intentionally omitted and must be passed separately.
 *
 * @param model - The backend Model to map
 * @returns A ProviderAccount ready for creation
 */
export function mapCloudModelToProviderAccount(model: Model): ProviderAccount {
  // label: provider + 模型名（如 "minimax MiniMax-M3"），用 remark 兜底
  const label = model.remark || `${model.provider} ${model.model}`;

  // Convert Unix timestamps to ISO strings
  const createdAt = new Date(model.created_at * 1000).toISOString();
  const updatedAt = new Date(model.updated_at * 1000).toISOString();

  return {
    id: `cloud-${model.id}`,
    vendorId: 'custom',
    label,
    authMode: 'api_key',
    baseUrl: LLMPROXY_BASE_URL,
    apiProtocol: 'openai-completions',
    model: model.model,
    enabled: true,
    isDefault: model.is_default, // May be overridden by caller
    createdAt,
    updatedAt,
  };
}

// ============================================================================
// Device Secret（客户端 HMAC 签名密钥，绑 mclaw 客户端）
// ============================================================================

/**
 * 获取客户端 deviceSecret（主进程 keychain 加密存储），提交给后端 IssueRuntimeKey
 * 绑定 runtime key。明文仅短暂存在于渲染进程内存，不持久化。
 */
async function getDeviceSecret(): Promise<string> {
  const bridge = window.mclaw?.getDeviceSecret;
  if (!bridge) {
    throw new Error('device secret bridge unavailable');
  }
  return bridge();
}

// ============================================================================
// Sync Workflow
// ============================================================================

/**
 * Sync options for cloud model → provider account.
 */
export interface SyncCloudModelOptions {
  /**
   * If true, sets the account as default after sync.
   * @default true
   */
  setAsDefault?: boolean;
}

/**
 * Sync result.
 */
export interface SyncCloudModelResult {
  /** The local account ID */
  accountId: string;
  /** Whether a new account was created */
  created: boolean;
}

/**
 * Synchronizes a backend Model to a local OpenClaw ProviderAccount.
 *
 * Steps:
 * 1. Fetch existing local accounts
 * 2. Create or update account with latest fields (refresh stale残留)
 * 3. Optionally set as default (refreshes openclaw.json primary)
 *
 * @param model - The backend Model to sync
 * @param options - Sync options
 * @returns Sync result with account ID and creation flag
 */
export async function syncCloudModelAsProviderAccount(
  model: Model,
  options?: SyncCloudModelOptions
): Promise<SyncCloudModelResult> {
  const { setAsDefault = true } = options ?? {};

  const localId = `cloud-${model.id}`;
  let created = false;

  try {
    // Step a: Fetch existing accounts
    const existingAccounts = await hostApi.providers.accounts();
    const existingAccount = existingAccounts.find((acc) => acc.id === localId);

    // Step b: 用最新字段映射（baseUrl/apiProtocol/model/label 可能因旧版 sync 残留过时值，
    // 例如 6/21 旧 OAuth 时代留下的 apiProtocol=anthropic-messages、baseUrl 缺失）。
    const mappedAccount = mapCloudModelToProviderAccount(model);
    if (setAsDefault) {
      mappedAccount.isDefault = true;
    }

    if (existingAccount) {
      // 已存在 —— 始终用最新字段刷新，避免旧残留 account 挡路。
      // 始终调 issueRuntimeKey：后端复用同 (uid,modelID) 已有 key，仅当 device_secret 不匹配
      // （换设备/老 key 无绑定）或快过期（<1h）才刷新返回新 key，否则返回原 key（不频繁签发）。
      // 续签即靠此机制——每次模型同步都会触发，后端按需刷新。本地缺失 key 时用返回的 key。
      const deviceSecret = await getDeviceSecret();
      const { key: runtimeKey } = await modelsApi.issueRuntimeKey(model.id, deviceSecret);
      const hasKey = await hostApi.providers.hasAccountApiKey(localId);
      const apiKeyToUpdate = hasKey ? undefined : runtimeKey;
      await hostApi.providers.updateAccount(localId, mappedAccount, apiKeyToUpdate);
      created = false;
    } else {
      // 不存在 —— 签发 runtime key 并创建指向后端 llmproxy 的 custom provider account。
      const deviceSecret = await getDeviceSecret();
      const { key: runtimeKey } = await modelsApi.issueRuntimeKey(model.id, deviceSecret);
      await hostApi.providers.createAccount({ account: mappedAccount, apiKey: runtimeKey });
      created = true;
    }

    // Step c: Set as default if requested（即便已是默认，setDefaultAccount 也会幂等刷新
    // openclaw.json 的 agents.defaults.model.primary + 注册 models.providers）
    if (setAsDefault) {
      await hostApi.providers.setDefaultAccount(localId);
    }

    return { accountId: localId, created };
  } catch (err) {
    // Wrap errors with context
    const vendorId = resolveVendorForCloudModel(model);
    const message = err instanceof Error ? err.message : String(err);
    throw new CloudSyncError({
      modelId: model.id,
      vendorId,
      originalMessage: message,
    });
  }
}