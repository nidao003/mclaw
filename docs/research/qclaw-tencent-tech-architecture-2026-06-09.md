# 腾讯 QClaw 技术架构逆向分析

> 调研时间：2026-06-09 | 方法：逆向工程 + 官网源码分析 + 仿站项目参考
> 官网：https://claw.guanjia.qq.com/ (也可 qclaw.qq.com)
> CDN：cdn.qclaw.qq.com

---

## 一、产品定位

| 维度 | 信息 |
|------|------|
| **全称** | QClaw - 微信远程办公 AI 助手 |
| **出品** | 腾讯（电脑管家团队） |
| **包名** | `@guanjia-openclaw/electron` |
| **定位** | 个人 AI 助手，微信远程控制电脑执行任务 |
| **平台** | macOS (Apple Silicon + Intel) + Windows |
| **开源状态** | ❌ 闭源（客户端），✅ Skills/Extensions 部分可见 |

---

## 二、整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    QClaw Desktop App                        │
│                    (Electron + Vue 3)                       │
├──────────────┬──────────────────┬───────────────────────────┤
│  渲染进程      │   主进程          │   Preload                │
│  (Vue 3 SPA)  │  (Node.js)       │   (Bridge)               │
│  聊天UI/设置   │  窗口管理/更新     │   electronAPI 暴露        │
│  微信扫码登录  │  Gateway 生命周期  │                           │
├──────────────┴──────────────────┴───────────────────────────┤
│                   OpenClaw Gateway (嵌入)                     │
│                   端口: 18789 (本地回环)                       │
│                   认证: Token 模式                             │
├─────────────────────────────────────────────────────────────┤
│                   Extensions / Plugins                       │
│  ┌─────────────────┐  ┌──────────────────────────────────┐  │
│  │  wechat-access   │  │  content-security                │  │
│  │  微信通道插件     │  │  内容安全审核拦截器               │  │
│  └────────┬────────┘  └──────────────────────────────────┘  │
├───────────┼─────────────────────────────────────────────────┤
│           │  AGP 协议 (WebSocket)                           │
│           ▼                                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  腾讯后端 (mmgrcalltoken.3g.qq.com)                   │    │
│  │  jprx 网关 (jprx.m.qq.com)                           │    │
│  │  微信用户 ←→ AI Agent 消息路由                         │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                   Skills (8个内置)                            │
│  find-skills | humanize-ai-text | imap-smtp-email            │
│  qclaw-env | qclaw-openclaw | qclaw-rules                    │
│  skill-vetter | xiaohongshu                                   │
├─────────────────────────────────────────────────────────────┤
│                   Model Provider                              │
│  qclaw/modelroute (openai-completions 兼容)                  │
│  自定义 baseUrl + apiKey (登录后自动注入)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、前端技术栈（逆向确认）

### 桌面客户端

| 层级 | 技术 | 证据 |
|------|------|------|
| **桌面框架** | Electron 35+ | package.json: `"electron": "^35.0.0"` |
| **前端框架** | **Vue 3** | 打包文件 `vue-ecosystem-CUEnf-QF.js` |
| **构建工具** | Vite | 标准 Electron-Vue 构建链，`out/renderer/` 结构 |
| **UI 组件** | 自定义组件 + Tailwind CSS | 渲染进程 CSS 中可见 utility classes |
| **类型系统** | TypeScript | `.ts` 扩展名文件 + 类型定义 |
| **状态管理** | Vue 响应式 + localStorage | 逆向代码可见 reactive state |
| **工具库** | @electron-toolkit/utils | package.json 声明依赖 |
| **日志** | electron-log | package.json 声明依赖 |
| **自动更新** | electron-updater | package.json 声明依赖 |

### 官网

| 层级 | 技术 | 证据 |
|------|------|------|
| **框架** | **Next.js** | `/_next/static/` 路径、RSC 数据格式 |
| **CSS** | 自定义 CSS（3个独立 CSS bundle） | `ae38943cda1743de.css` 等 |
| **图标** | Font Awesome 6.4.0 | CDN 引入 |
| **SEO** | 结构化数据 (JSON-LD) | SoftwareApplication schema |
| **CDN** | cdn.qclaw.qq.com | 图片和静态资源 |

### 仿站项目 (QClaw-Mimic) — 暴露了 UI 设计细节

| 层级 | 技术 | 说明 |
|------|------|------|
| **框架** | Vue 3.5 + TypeScript | 与 QClaw 桌面端同框架 |
| **UI 组件** | **shadcn-vue** (new-york 风格) | stone 基色、CSS 变量 |
| **Headless** | **reka-ui** | shadcn-vue 底层 headless 组件 |
| **样式** | **Tailwind CSS 4** | @tailwindcss/vite 插件 |
| **图标** | lucide-vue-next | 与 shadcn 生态配套 |
| **动画** | tsparticles | 粒子特效 |
| **构建** | Vite 8 (beta) | 最新版 |

---

## 四、通信架构（核心）

### 4.1 认证流程

```
用户扫码 → 微信 OAuth2 → 获取 auth code
    → wxLogin({guid, code, state}) API
    → 返回 channel_token + jwt_token
    → 写入 OpenClaw 配置:
        channels.wechat-access.token = channelToken
        models.providers.qclaw.apiKey = apiKey
        plugins.entries.content-security.config.token = channelToken
```

### 4.2 WebSocket 通信 (AGP 协议)

**连接地址**: `wss://mmgrcalltoken.3g.qq.com/agentwss?token={channelToken}`

**消息格式 (统一信封)**:
```typescript
{
  msg_id: string,      // UUID v4，去重用
  guid: string,        // 设备标识
  user_id: string,     // 微信用户 ID
  method: string,      // 消息类型
  payload: object      // 具体数据
}
```

**下行 (服务端 → 客户端)**:
| method | 说明 |
|--------|------|
| `session.prompt` | 用户发来的消息 |
| `session.cancel` | 取消正在执行的任务 |

**上行 (客户端 → 服务端)**:
| method | 说明 |
|--------|------|
| `session.update` | 流式中间结果 (文本片段/工具调用) |
| `session.promptResponse` | 最终响应 (stop_reason: end_turn/cancelled/error/refusal) |

### 4.3 HTTP API (jprx 网关)

**基础地址**: `https://jprx.m.qq.com/`

**通用请求头**:
```
Content-Type     : application/json
X-Version        : 1
X-Token          : <loginKey>
X-Guid           : <machine GUID>
X-Account        : <userId>
X-Session        : ""
X-OpenClaw-Token : <JWT>
```

**关键 API 端点**:
| 端点 | 用途 |
|------|------|
| `data/4018/forward` | 生成联系人链接 |
| `data/4019/forward` | 查询设备状态 |
| `data/4020/forward` | 断开设备连接 |
| `data/4026/forward` | 微信登录 |
| `data/4027/forward` | 获取用户信息 |
| `data/4028/forward` | 登出 |
| `data/4050/forward` | 获取微信登录状态 |
| `data/4055/forward` | 创建 API Key |
| `data/4056/forward` | 检查邀请码 |
| `data/4057/forward` | 提交邀请码 |
| `data/4058/forward` | 刷新通道 Token |
| `data/4064/forward` | 内容安全审核 |
| `data/4066/forward` | 检查更新 |

### 4.4 连接特性
- **自动重连**: 指数退避 (3s → 4.5s → ... → max 25s)
- **心跳**: 每 20 秒 ping/pong
- **休眠检测**: 系统唤醒后自动重连 (timer drift > 15s)
- **消息去重**: Set 存储 msg_id，每 5 分钟清理 (上限 1000)

---

## 五、OpenClaw 嵌入配置

QClaw 内嵌了完整 OpenClaw Gateway：

```json
{
  "agents": {
    "defaults": {
      "model": { "primary": "qclaw/modelroute" },
      "workspace": "~/.openclaw/workspace"
    }
  },
  "models": {
    "mode": "merge",
    "providers": {
      "qclaw": {
        "baseUrl": "",           // 登录后注入
        "apiKey": "",            // 登录后注入
        "api": "openai-completions",
        "models": [{ "id": "modelroute", "name": "modelroute" }]
      }
    }
  },
  "browser": { "enabled": true, "defaultProfile": "openclaw" },
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "loopback",
    "auth": { "mode": "token" }
  },
  "channels": {
    "wechat-access": { "enabled": true, "token": "", "wsUrl": "" }
  },
  "plugins": {
    "enabled": true,
    "allow": ["wechat-access", "content-security"],
    "entries": {
      "wechat-access": { "enabled": true },
      "content-security": {
        "enabled": true,
        "config": {
          "endpoint": "https://jprx.m.qq.com/data/4064/forward",
          "token": ""
        }
      }
    }
  }
}
```

---

## 六、为什么 QClaw UI 最好看？

### 6.1 设计语言分析

| 设计要素 | QClaw 方案 | 效果 |
|---------|-----------|------|
| **配色** | 深色主题 + 渐变红色强调 (linear-gradient 135deg, #FF3B30, #FF6B5E) | 专业、有辨识度 |
| **基色** | stone (暖灰) | 比 slate/gray 更温暖高级 |
| **圆角** | 大圆角 (10px+) | 现代、亲和 |
| **组件库** | 类 shadcn-vue (new-york) | 精致、统一、细节到位 |
| **图标** | lucide | 线性图标，简洁优雅 |
| **动效** | tsparticles 粒子 + CSS 过渡 | 科技感+流畅感 |
| **字体** | 思源黑体/MiSans | 中文优化，阅读舒适 |

### 6.2 对比 ClawX/开源版

| 维度 | QClaw (腾讯) | ClawX (开源) |
|------|-------------|-------------|
| **UI 框架** | Vue 3 + 类 shadcn | React 19 + Radix UI |
| **设计团队** | 腾讯设计团队 | 开发者主导 |
| **设计规范** | 企业级设计系统 | 功能优先 |
| **动画** | 粒子特效+流畅过渡 | 基础过渡 |
| **登录体验** | 微信扫码一键登录 | 手动配置 API Key |
| **首次体验** | 邀请码+环境自检 | 引导向导 |

### 6.3 核心差异：腾讯的"设计基因"

QClaw UI 好看的根本原因不是技术选型，而是**腾讯的设计基因**：
1. **专业设计团队** — 有专门的 UI/UX 设计师，不是开发者自己搞
2. **企业级设计系统** — 统一的设计语言和组件规范
3. **细节打磨** — 间距、颜色、动效都经过反复调优
4. **品牌一致性** — 红色强调色 + 小龙虾 IP，品牌辨识度高

---

## 七、对 mclaw 二次开发的启示

### 可以直接借鉴的

| 借鉴点 | 具体方案 | 难度 |
|--------|---------|------|
| **shadcn-vue 组件体系** | 用 shadcn-vue (new-york, stone) 替换 Radix UI | ⭐⭐⭐ 中 |
| **Tailwind CSS 4** | 升级 Tailwind 到 v4，利用新特性 | ⭐⭐ 低 |
| **lucide 图标** | 替换现有图标库 | ⭐ 低 |
| **深色主题+渐变强调** | 仿照 QClaw 配色方案 | ⭐ 低 |
| **粒子动画首页** | 用 tsparticles 做启动页/首页 | ⭐⭐ 低 |
| **大圆角设计** | 调整 border-radius | ⭐ 低 |

### 不适合照搬的

| 不搬 | 原因 |
|------|------|
| Vue 3 框架 | ClawX 是 React 体系，迁移成本巨大 |
| 闭源通信协议 | 腾讯私有 jprx 网关，无法复用 |
| 微信 OAuth | 需要腾讯 AppID，个人无法获取 |
| content-security | 腾讯内部审核系统 |

### 推荐策略

**在 React 体系内实现 QClaw 级别的 UI**：
1. 用 **shadcn/ui** (React 版) 替换 Radix UI 裸用 → 同样的 new-york 风格
2. 配色方案对齐 QClaw：stone 基色 + 渐变红色强调
3. 加入 lucide-react 图标
4. 加入 tsparticles-react 首页动效
5. 优化深色模式，打磨间距和圆角

---

## 八、信息来源

| 来源 | URL | 用途 |
|------|-----|------|
| QClaw 逆向项目 | github.com/jooooock/QClaw | 客户端技术栈、通信协议 |
| QClaw 微信客户端 | github.com/photon-hq/qclaw-wechat-client | AGP 协议、API 端点 |
| QClaw 仿站 | github.com/bao-cn/QClaw-Mimic | UI 组件体系、设计规范 |
| OpenQClaw | github.com/haroldneo/OpenQClaw | 邀请码绕过机制 |
| QClaw 官网 | claw.guanjia.qq.com | 官网技术栈 (Next.js) |
