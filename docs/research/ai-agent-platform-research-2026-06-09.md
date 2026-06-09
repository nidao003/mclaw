# AI Agent 应用端开源底座调研报告

> 调研时间：2026-06-09 | 调研人：老王 | 需求：为 mclaw 项目寻找可替代/参考的开源底座

---

## 一、当前项目现状

**mclaw** 基于 **ClawX**（OpenClaw 桌面客户端）二次开发，定位类似腾讯 QClaw、WorkBuddy 的 AI Agent 应用端。

| 项目 | 说明 |
|------|------|
| ClawX | OpenClaw 的 Electron + React 桌面客户端，MIT 许可，7.4k⭐ |
| OpenClaw | AI Agent 编排引擎（CLI），嵌入 ClawX 运行 |
| mclaw | 基于 ClawX 的品牌化改造版（当前项目） |

---

## 二、调研项目全景

### 🔥 第一梯队：全栈 AI Agent 平台（UI + 后端 + 工作流）

| 项目 | ⭐ Stars | 语言 | 许可证 | 定位 | 商业改名 |
|------|---------|------|--------|------|---------|
| **LangFlow** | 149k | Python | **MIT** ✅ | 可视化 Agent/工作流构建器 | ✅ 可自由改名 |
| **Dify** | 144k | TS + Python | 修改版 Apache 2.0 | Agentic Workflow 平台 | ⚠️ 需保留 LOGO/版权，多租户需商业授权 |
| **Open WebUI** | 140k | Python | 自定义 BSD | AI 聊天界面（Ollama/OpenAI） | ⚠️ 50人以内可改名，否则需授权 |
| **LobeChat/LobeHub** | 78k | TypeScript | 自定义社区许可 | Agent 运营平台 | ❌ 限制严格 |
| **Coze Studio** | 21k | TypeScript | **Apache 2.0** ✅ | AI Agent 开发平台 | ✅ 可自由改名 |

### 💻 第二梯队：桌面 AI 客户端（Electron 应用）

| 项目 | ⭐ Stars | 语言 | 许可证 | 定位 | 商业改名 |
|------|---------|------|--------|------|---------|
| **NextChat** | 88k | TypeScript | **MIT** ✅ | 轻量 AI 助手 | ✅ 可自由改名 |
| **Cherry Studio** | 47k | TypeScript | AGPL-3.0 | AI 生产力工作室 | ⚠️ 需开源衍生品 |
| **Jan** | 43k | TypeScript | 自定义 | 离线 AI 客户端 | ⚠️ 限制待确认 |
| **LibreChat** | 38.7k | TypeScript | **MIT** ✅ | 增强版 ChatGPT 克隆 | ✅ 可自由改名 |
| **ClawX** | 7.4k | TypeScript | **MIT** ✅ | OpenClaw 桌面客户端 | ✅ 可自由改名 |

### 🔧 第三梯队：纯 Agent 框架（无 UI，仅 SDK）

| 项目 | ⭐ Stars | 语言 | 许可证 | 定位 |
|------|---------|------|--------|------|
| AutoGPT | 185k | Python | 自定义 | 自主 AI Agent |
| Microsoft AutoGen | 59k | Python | CC-BY-4.0 | 多 Agent 编排框架 |
| CrewAI | 53k | Python | **MIT** ✅ | 角色 Agent 协作 |
| Flowise | 53k | TypeScript | 自定义 | 可视化 AI Agent |

### 📚 第四梯队：RAG/文档问答向

| 项目 | ⭐ Stars | 语言 | 许可证 | 定位 |
|------|---------|------|--------|------|
| AnythingLLM | 61k | JavaScript | **MIT** ✅ | 全能 RAG 平台 |
| Kotaemon | 25k | Python | **Apache 2.0** ✅ | RAG 文档聊天 |
| QAnything | 14k | Python | AGPL-3.0 | 网易有道问答系统 |

---

## 三、核心维度对比（适合做"应用端底座"的项目）

### 1. 可二次开发性

| 项目 | 前端可改 | 后端可改 | 插件/扩展 | 主题/皮肤 | 评分 |
|------|---------|---------|----------|----------|------|
| **Dify** | ✅ React | ✅ Python | ✅ MCP/工具/API | ✅ | ⭐⭐⭐⭐⭐ |
| **LangFlow** | ✅ React | ✅ Python | ✅ 自定义组件 | ⚠️ 有限 | ⭐⭐⭐⭐ |
| **Open WebUI** | ✅ Svelte | ✅ Python | ✅ 函数/管道 | ✅ 社区主题 | ⭐⭐⭐⭐ |
| **Coze Studio** | ✅ React/Next | ⚠️ 受限 | ✅ 插件体系 | ✅ | ⭐⭐⭐⭐ |
| **LibreChat** | ✅ React | ✅ Node.js | ✅ MCP/工具 | ⚠️ 有限 | ⭐⭐⭐⭐ |
| **NextChat** | ✅ Next.js | ⚠️ Edge轻量 | ❌ 无插件 | ✅ | ⭐⭐⭐ |
| **ClawX** | ✅ React/Electron | ✅ OpenClaw | ✅ MCP/技能 | ✅ | ⭐⭐⭐⭐ |

### 2. 工具集成能力

| 项目 | MCP 支持 | 自定义工具 | API 调用 | RAG | 多 Agent | 评分 |
|------|---------|----------|---------|-----|---------|------|
| **Dify** | ✅ | ✅ 丰富 | ✅ REST | ✅ 内置 | ✅ | ⭐⭐⭐⭐⭐ |
| **LangFlow** | ⚠️ 新增 | ✅ 组件化 | ✅ | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| **Open WebUI** | ✅ | ✅ 函数 | ✅ Ollama/OpenAI | ✅ | ❌ | ⭐⭐⭐ |
| **Coze Studio** | ✅ | ✅ 插件 | ✅ | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| **LibreChat** | ✅ | ✅ | ✅ 多模型 | ✅ | ✅ Agent | ⭐⭐⭐⭐ |
| **ClawX** | ✅ | ✅ 技能系统 | ✅ 多模型 | ⚠️ | ✅ | ⭐⭐⭐⭐ |

### 3. 用户界面成熟度

| 项目 | 聊天界面 | 工作流编辑器 | 管理后台 | 多语言 | 移动端 | 评分 |
|------|---------|------------|---------|--------|--------|------|
| **Dify** | ✅ | ✅ 可视化 | ✅ 完善 | ✅ | ❌ | ⭐⭐⭐⭐⭐ |
| **LangFlow** | ✅ | ✅ 拖拽式 | ⚠️ 基础 | ✅ | ❌ | ⭐⭐⭐⭐ |
| **Open WebUI** | ✅ | ❌ | ✅ | ✅ | ❌ | ⭐⭐⭐⭐ |
| **Coze Studio** | ✅ | ✅ 可视化 | ✅ | ✅ | ❌ | ⭐⭐⭐⭐⭐ |
| **LibreChat** | ✅ | ❌ | ⚠️ | ✅ | ⚠️ PWA | ⭐⭐⭐⭐ |
| **ClawX** | ✅ | ❌ | ⚠️ 设置页 | ✅ | ❌ | ⭐⭐⭐ |

---

## 四、许可证友好度排名（商业改名能力）

| 排名 | 项目 | 许可证 | 能否品牌化改名 | 关键限制 |
|------|------|--------|--------------|---------|
| 🥇 | LangFlow | **MIT** | ✅ 完全自由 | 无 |
| 🥇 | NextChat | **MIT** | ✅ 完全自由 | 无 |
| 🥇 | LibreChat | **MIT** | ✅ 完全自由 | 无 |
| 🥇 | AnythingLLM | **MIT** | ✅ 完全自由 | 无 |
| 🥇 | ClawX | **MIT** | ✅ 完全自由 | 无 |
| 🥈 | Coze Studio | **Apache 2.0** | ✅ 需保留 NOTICE | 需声明修改 |
| 🥈 | Kotaemon | **Apache 2.0** | ✅ 需保留 NOTICE | 需声明修改 |
| 🥉 | Dify | 修改版 Apache 2.0 | ⚠️ 不能改 LOGO | 多租户需商业授权 |
| 🥉 | Open WebUI | 自定义 BSD | ⚠️ ≤50人可改名 | >50人需书面授权 |
| 4 | Cherry Studio | AGPL-3.0 | ⚠️ 必须开源衍生品 | 网络服务也需开源 |
| 4 | LobeChat | 自定义社区许可 | ❌ 限制严格 | 需仔细阅读条款 |
| 5 | Jan | 自定义 | ⚠️ 待确认 | - |

---

## 五、🏆 Top 3 推荐

### 🥇 推荐 #1：Dify — 最全能的商业底座

**推荐理由：**
- ⭐ 144k Stars，社区最活跃，生态最成熟
- 前端 React + 后端 Python，全栈可控
- 内置可视化工作流编辑器（这是杀手锏！）
- MCP 支持、RAG、多 Agent、插件系统全部有
- Docker 一键部署，企业级就绪

**风险点：**
- 许可证是修改版 Apache 2.0，**前端不能去 LOGO**
- 多租户 SaaS 模式需购买商业授权
- 如果你的应用是单租户 + 后端服务方式，前端 LOGO 问题可以通过"不用 Dify 前端"绕开

**适用场景：** 需要完整工作流编排能力 + 成熟管理后台的商业应用

---

### 🥈 推荐 #2：Coze Studio — 字节系开源的 Agent 开发平台

**推荐理由：**
- ⭐ 21k Stars，字节跳动出品，质量有保障
- **Apache 2.0 许可证**，商业友好度仅次于 MIT
- 完整的可视化 Agent 构建器 + 插件系统 + 知识库
- 前端 TypeScript/Next.js，技术栈现代
- 设计理念最接近 QClaw/WorkBuddy

**风险点：**
- 开源时间较短（2025年），生态还在成长
- 中文社区为主，国际化一般
- 文档可能不如 Dify 完善

**适用场景：** 最接近"QClaw 风格"的 Agent 平台，适合快速搭出产品

---

### 🥉 推荐 #3：LibreChat — MIT 许可的 ChatGPT 增强克隆

**推荐理由：**
- ⭐ 38.7k Stars，**MIT 许可**，完全自由改名
- 前端 React + 后端 Node.js，全 TypeScript 栈
- 支持多模型（OpenAI/Anthropic/Google/本地模型）
- 支持 MCP、Agent、RAG
- 最接近"ChatGPT 应用端"的体验

**风险点：**
- 没有可视化工作流编辑器
- 定位偏聊天，不如 Dify/Coze 全面
- 管理后台较基础

**适用场景：** 需要最自由许可 + 聊天式 Agent 交互的应用端

---

## 六、与当前 ClawX 方案的对比

| 维度 | ClawX（当前方案） | Dify | Coze Studio | LibreChat |
|------|-------------------|------|-------------|-----------|
| 许可证 | ✅ MIT | ⚠️ 改版 Apache | ✅ Apache 2.0 | ✅ MIT |
| 桌面端 | ✅ Electron 原生 | ❌ Web Only | ❌ Web Only | ❌ Web Only |
| 工作流编辑 | ❌ | ✅ 可视化 | ✅ 可视化 | ❌ |
| MCP 支持 | ✅ | ✅ | ✅ | ✅ |
| 多 Agent | ✅ | ✅ | ✅ | ✅ |
| 移动端 | ❌ | ❌ | ❌ | ⚠️ PWA |
| 自托管 | ✅ | ✅ | ✅ | ✅ |
| 社区活跃 | ⭐ 中等 | ⭐ 最活跃 | ⭐ 成长中 | ⭐ 活跃 |

---

## 七、老王的建议

**如果你要搞"应用端"（不是纯后台），路线如下：**

### 方案 A：继续基于 ClawX（最省力）
- ClawX 是 MIT，品牌化零风险
- 已有桌面端，Electron 生态成熟
- 缺点：没有工作流编辑器，Web 端需要额外开发

### 方案 B：Dify 后端 + 自研前端（最全能）
- 用 Dify 作为 Agent 编排后端（API 模式不需要前端 LOGO）
- 自己做前端应用端（Web + 桌面）
- 享受 Dify 的可视化工作流能力，绕开许可证限制

### 方案 C：Coze Studio 全栈改造（最像 QClaw）
- Apache 2.0 许可，商业友好
- 产品形态最接近你想要的"Agent 应用端"
- 需要投入精力做品牌化改造

---

*数据来源：GitHub API（2026-06-09），各项目官方仓库*
