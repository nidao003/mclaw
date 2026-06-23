/**
 * Cloud Model → OpenClaw ProviderAccount Synchronization
 *
 * Bridges backend Model entities to local OpenClaw ProviderAccount entries.
 * This module provides pure mapping functions and a sync workflow.
 */

import type { Model, InterfaceType } from '@mclaw/shared/types/model';
import type {
  ProviderAccount,
  ProviderType,
  ProviderProtocol,
  ProviderVendorInfo,
} from '@/lib/providers';
import { hostApi } from '@/lib/host-api';

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
// OAuth Vendor Handling
// ============================================================================

/**
 * 后端 provider 字符串集合：这些 vendor 的凭据只能由用户在 mclaw UI 走 OAuth
 * 登录获得（token 存在 auth-profiles.json），云端 sync 不应为其创建 api_key
 * account，而应复用用户已登录的本地 OAuth account。
 *
 * MiniMax 即典型代表：OpenClaw 内置 minimax-portal / minimax-portal-cn 两个
 * OAuth provider，若误将其映射成 custom api_key vendor，会生成 models.providers
 * 里不存在的 custom-XXXXXXXX key，导致 Gateway 报 "Unknown model"。
 *
 * 注意：后端 models 表的 provider 列大小写不固定（实测既有 "MiniMax" 也有
 * "minimax"），故匹配须大小写不敏感。
 */
const OAUTH_CLOUD_VENDORS = new Set<string>(['minimax']);

/**
 * 判断云端模型是否属于 OAuth vendor（其 token 须由用户在 UI 登录获得）。
 * 大小写不敏感。
 */
export function isOAuthCloudModel(model: Model): boolean {
  return OAUTH_CLOUD_VENDORS.has(model.provider.trim().toLowerCase());
}

/**
 * 根据 base_url 推断 OAuth 云端模型对应的本地 ProviderType。
 * - base_url 含 minimax.io  → minimax-portal（国际版）
 * - base_url 含 minimaxi.com → minimax-portal-cn（国内版）
 * - 为空默认 minimax-portal-cn（用户在国内）
 * 非 OAuth vendor 返回 null。
 */
export function resolveOAuthVendorForCloudModel(model: Model): ProviderType | null {
  if (!isOAuthCloudModel(model)) return null;
  const provider = model.provider.trim().toLowerCase();
  if (provider === 'minimax') {
    const url = (model.base_url || '').toLowerCase();
    if (url.includes('minimax.io')) return 'minimax-portal';
    return 'minimax-portal-cn';
  }
  return null;
}

// ============================================================================
// Protocol Mapping
// ============================================================================

/**
 * Derives the OpenClaw protocol from backend interface_type + vendor.
 */
export function deriveInterfaceProtocol(
  interfaceType: InterfaceType,
  vendorId: ProviderType
): ProviderProtocol {
  // Direct interface type mappings
  switch (interfaceType) {
    case 'openai_chat':
      return 'openai-completions';
    case 'openai_responses':
      return 'openai-responses';
    case 'anthropic':
      return 'anthropic-messages';
  }

  // Vendor-specific fallbacks
  if (vendorId === 'ollama') {
    return 'ollama';
  }

  // Default fallback - vendorInfo.apiProtocol would be used if available
  return 'openai-completions';
}

// ============================================================================
// Pure Mapping Function
// ============================================================================

/**
 * Maps a backend Model to an OpenClaw ProviderAccount.
 *
 * NOTE: This is a pure mapping - no API calls are made.
 * The apiKey is intentionally omitted and must be passed separately.
 *
 * @param model - The backend Model to map
 * @param vendorInfo - Optional vendor metadata for additional context
 * @returns A ProviderAccount ready for creation
 */
export function mapCloudModelToProviderAccount(
  model: Model,
  vendorInfo?: ProviderVendorInfo
): ProviderAccount {
  const vendorId = resolveVendorForCloudModel(model);

  // Build label: use remark if available, otherwise provider/model
  const label = model.remark || `${model.provider} / ${model.model}`;

  // Auth mode: Ollama uses local auth, others require API key
  const authMode = vendorId === 'ollama' ? 'local' : 'api_key';

  // Determine API protocol
  const apiProtocol = deriveInterfaceProtocol(model.interface_type, vendorId);

  // Convert Unix timestamps to ISO strings
  const createdAt = new Date(model.created_at * 1000).toISOString();
  const updatedAt = new Date(model.updated_at * 1000).toISOString();

  // Build base URL - prefer model.base_url if provided
  const baseUrl = model.base_url || vendorInfo?.defaultBaseUrl;

  return {
    id: `cloud-${model.id}`,
    vendorId,
    label,
    authMode,
    baseUrl,
    apiProtocol,
    model: model.model,
    enabled: true,
    isDefault: model.is_default, // May be overridden by caller
    createdAt,
    updatedAt,
  };
}

// ============================================================================
// Sync Workflow
// ============================================================================

/**
 * Sync options for cloud model → provider account.
 */
export interface SyncCloudModelOptions {
  /**
   * If true, overwrites existing account even if it already exists.
   * @default false
   */
  force?: boolean;
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
 * 2. Check for existing account by ID
 * 3. Create or update based on force flag
 * 4. Optionally set as default
 * 5. Ensure API key is persisted
 *
 * @param model - The backend Model to sync
 * @param options - Sync options
 * @returns Sync result with account ID and creation flag
 */
export async function syncCloudModelAsProviderAccount(
  model: Model,
  options?: SyncCloudModelOptions
): Promise<SyncCloudModelResult> {
  const { force = false, setAsDefault = true } = options ?? {};

  const localId = `cloud-${model.id}`;
  let created = false;

  try {
    // Step a: Fetch existing accounts
    const existingAccounts = await hostApi.providers.accounts();

    // OAuth vendor（如 MiniMax）：token 只能由用户在 UI 登录获得，不创建
    // api_key account，而是复用已登录的同名 OAuth account 并设为默认。
    // 误走 custom api_key 路径会生成 models.providers 里不存在的 custom-XXXX
    // provider key，导致 Gateway 报 "Unknown model"。
    const oauthVendor = resolveOAuthVendorForCloudModel(model);
    if (oauthVendor) {
      // 优先找 vendorId 精确匹配的已登录 OAuth account；
      // 退而找任意 minimax OAuth account（CN/Global 同一时刻只激活一个区域，
      // token 都落在 minimax-portal:default）。
      const preferred = existingAccounts.find(
        (a) => a.vendorId === oauthVendor && a.authMode !== 'api_key' && a.enabled,
      );
      const fallback = existingAccounts.find(
        (a) =>
          (a.vendorId === 'minimax-portal' || a.vendorId === 'minimax-portal-cn') &&
          a.authMode !== 'api_key' &&
          a.enabled,
      );
      const target = preferred ?? fallback;
      if (target) {
        if (setAsDefault) {
          await hostApi.providers.setDefaultAccount(target.id);
        }
        return { accountId: target.id, created: false };
      }
      // 用户尚未登录 MiniMax OAuth：跳过，不创建错误 account。
      console.warn(
        '[CloudSync] MiniMax OAuth account not found locally; skipping sync. ' +
          'Please sign in to MiniMax in Settings → Providers.',
      );
      return { accountId: '', created: false };
    }

    const existingAccount = existingAccounts.find((acc) => acc.id === localId);

    // Step b & c: Check existence and decide action
    if (existingAccount && !force) {
      // Already exists and not forcing - just ensure it's enabled
      if (!existingAccount.enabled) {
        await hostApi.providers.updateAccount(
          localId,
          { enabled: true },
          undefined
        );
      }
      return { accountId: localId, created: false };
    }

    // Step d: Map the model to account
    const mappedAccount = mapCloudModelToProviderAccount(model);

    // Override isDefault based on options
    if (setAsDefault) {
      mappedAccount.isDefault = true;
    }

    if (existingAccount && force) {
      // Update existing account
      await hostApi.providers.updateAccount(
        localId,
        mappedAccount,
        model.api_key || undefined
      );
    } else {
      // Create new account
      // createAccount accepts { account, apiKey? }
      await hostApi.providers.createAccount({
        account: mappedAccount,
        apiKey: model.api_key,
      });
      created = true;
    }

    // Step e: Set as default if requested
    if (setAsDefault) {
      await hostApi.providers.setDefaultAccount(localId);
    }

    // Step f: Ensure API key is persisted (double-check after creation)
    // The createAccount with apiKey should handle this, but verify if needed
    if (model.api_key && !created) {
      // If we updated and have an API key, ensure it's set
      // This is a safety check - typically not needed
      await hostApi.providers.updateAccount(
        localId,
        {},
        model.api_key
      );
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