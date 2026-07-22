# Runtime Key 过期 401 永久修复 + 打包长期可用方案

## 问题

- runtime key 24h 过期，**无定时续签**（记忆 `runtime-key-binding` 第 38 行明确"待运行环境验证后按需补常驻定时器"）
- 长期使用（开 mclaw >24h 不重启、系统休眠 >24h 唤醒立即对话）必触发 401
- 已修 `cloud-provider-sync.ts` 的 `hasKey` 优化 bug（始终用后端返回 key 覆盖），但续签机制未补
- 打包模式 HMAC preload 注入未端到端验证（记忆第 37 行）

## 方案（三层防护）

### 第 1 层：定时续签（防过期，核心）

**文件**：`src/hooks/useCloudModelSyncOnLogin.ts`

在现有登录 sync 的 useEffect 之外，加一个独立的定时续签 useEffect：

```ts
useEffect(() => {
  if (!user) return;
  const RENEW_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12h（key 24h 过期，余量足）
  const timer = setInterval(async () => {
    try {
      const { defaultCloudModel, userOverrideDefaultToLocal } = useCloudModelStore.getState();
      if (userOverrideDefaultToLocal || !defaultCloudModel) return;
      await syncCloudModelAsProviderAccount(defaultCloudModel, { setAsDefault: true });
    } catch (err) {
      console.error('[runtime-key-renew] periodic renew failed:', err);
    }
  }, RENEW_INTERVAL_MS);
  return () => clearInterval(timer);
}, [user?.id]);
```

- 后端 `issueRuntimeKey` 复用机制：key 未过期且 device_secret 匹配时返回原 key（不刷新），12h 续签大多数幂等
- 登录时已有 sync（启动续签）+ 12h 定时续签 → 覆盖长期运行
- hook 挂在 `App.tsx:122`，随主窗口生命周期；退出登录 user=null 自动 clearInterval

### 第 2 层：401 自动续签 + 重试（兜底，确保不出现）

**文件**：`src/stores/chat.ts` + `src/hooks/useCloudModelSyncOnLogin.ts`

用户已确认要"自动续签+重试"（无感）。实现：

**a. chat store 加 lastSent 重试状态**（chat.ts）

在 ChatState 加字段：
```ts
lastSentForRetry: {
  text: string;
  attachments?: Array<{...}>;
  targetAgentId?: string | null;
  retryCount: number;
} | null;
```

`sendMessage`（chat.ts:3421）开头记录：
```ts
set({ ..., lastSentForRetry: { text: trimmed, attachments, targetAgentId, retryCount: 0 } });
```

**b. 401 检测 + 重试**（chat.ts:4035 `case 'error'`）

在 `commitRuntimeError` 之前插入 401 检测：
```ts
const isAuthError = /\b401\b|unauthorized/i.test(errorMsg);
const last = get().lastSentForRetry;
if (isAuthError && wasSending && last && last.retryCount < 1) {
  // 不设 runError，异步续签 + 重试一次
  set({ sending: false, activeRunId: null, runError: null,
        lastSentForRetry: { ...last, retryCount: last.retryCount + 1 } });
  (async () => {
    try {
      const { defaultCloudModel } = useCloudModelStore.getState();
      if (defaultCloudModel) {
        await syncCloudModelAsProviderAccount(defaultCloudModel, { setAsDefault: true });
      }
      // 续签成功，重试上次消息
      await get().sendMessage(last.text, last.attachments ?? undefined, last.targetAgentId ?? null);
    } catch (e) {
      set({ runError: '登录态已过期，请重新登录后重试', sending: false });
    }
  })();
  return; // 跳过 commitRuntimeError
}
```

- 重试只一次（retryCount 限制），避免无限循环
- 续签失败 → 友好提示重新登录
- 重试的 sendMessage 会再走 case 'error'，若再 401（retryCount=1）则正常设 runError

**c. 退出登录清空 lastSentForRetry**（authStore.logout 或 hook）

避免换账号后误重试上账号的消息。

### 第 3 层：打包 preload 验证

**代码确认**（`electron/gateway/process-launcher.ts:271-283`）：
- standalone-node 模式 dev/packaged 都通过 `NODE_OPTIONS --require` 注入 `GATEWAY_FETCH_PRELOAD_SOURCE`
- preload 含 `signLlmProxy`（命中 `MCLAW_LLMPROXY_HOST` 时算 HMAC 塞 `X-Mclaw-Sig` 头）
- dev 模式本次 401 是 key 过期（`proxy.go:170` 在验签前判过期），key 修复后会走验签——dev 测通即证明签名链路生效

**验证方式**：
1. dev 模式修复 key 后（已改 cloud-provider-sync.ts）重启登录测对话 → 确认签名通过（非 401）
2. packaged 模式逻辑相同，打包后复测一次对话

### 不做（YAGNI）

- **退出登录清理本地 custom-cloudb8c key**：修复后 sync 始终覆盖 key，账号已单个（无切换残留），不需要
- **系统休眠唤醒检测续签（powerMonitor/visibilitychange）**：第 2 层 401 兜底已覆盖休眠场景，不额外加

## 改动文件清单

| 文件 | 改动 |
|------|------|
| `src/hooks/useCloudModelSyncOnLogin.ts` | 加 12h 定时续签 useEffect |
| `src/stores/chat.ts` | 加 `lastSentForRetry` 字段；`sendMessage` 记录；`case 'error'` 加 401 检测+续签+重试 |
| `src/stores/chat.ts` ChatState 类型 | 加 `lastSentForRetry` 类型 |

## 验证

1. **typecheck**：`pnpm typecheck`（pre-existing 错误除外，新改动不引入错误）
2. **dev 对话**：重启 mclaw 登录，发消息确认正常回复（key 修复 + 签名通过）
3. **定时续签**：临时把间隔改 1min，确认续签触发（看后端日志 issueRuntimeKey）
4. **401 兜底**：临时把本地 key 改成无效值，发消息确认自动续签+重试一次成功
5. **packaged**：打包后登录对话复测

## 风险

- chat.ts 状态机复杂，401 重试逻辑要小心（已用 retryCount 限制 + sending 状态管理避免重复发送）
- 重试的 sendMessage 会重新乐观插入用户消息——需确认不会产生重复消息（sendMessage 开头有 double-submit guard，:3432）
- 续签是异步的，重试期间用户可能操作——sending=false 期间允许新发送，需确认状态一致
