# Skills 跨平台分发与安装方案 —— 调研分析

> 日期：2026-06-12 | 作者：老王（部署工程师）

---

## 一、现状分析

### 1.1 mclaw 的 Skills 双层架构

mclaw 有两套 Skills 系统，它们目前是割裂的：

| 层级 | 存储位置 | 格式 | 用途 |
|------|---------|------|------|
| **市场层**（Web 端） | PostgreSQL `skills` 表 | 数据库字段 `content`（Markdown 文本） | Web 浏览、搜索、安装计数 |
| **执行层**（Electron 端） | 文件系统 `~/.mclaw/skills/` | `SKILL.md` 文件（YAML frontmatter + Markdown） | 桌面端实际加载和执行 |

**关键问题**：市场层的 skill `content` 是裸 Markdown，没有 YAML frontmatter。市场创建技能（`CreateSkill` 页面）只把内容存进数据库，**没有生成 `SKILL.md` 文件的能力**。

### 1.2 mclaw 已经支持的 Skill 目录扫描

Electron 端的 `local-skill-service.ts` 已经扫描以下目录：

```
~/.mclaw/skills/          # mclaw 管理的技能
~/.agents/skills/          # 个人级 Codex 兼容
$CWD/.agents/skills/       # 项目级 Codex 兼容
$CWD/skills/               # 工作区技能
```

**这说明 mclaw 天然兼容 Agent Skills 开放标准**，已经能加载 `~/.agents/skills/` 下的 `SKILL.md`。

### 1.3 当前缺失的能力

1. **从数据库 skill 导出为 `SKILL.md` 文件** —— 无此功能
2. **一键安装到外部平台目录** —— 无此功能
3. **市场 API 对外暴露下载** —— 仅有浏览/搜索/安装计数 API
4. **SKILL.md frontmatter 生成** —— `content` 不含 YAML 头

---

## 二、外部平台 Skills 规范对比

### 2.1 统一标准：Agent Skills 开放标准

Anthropic 发起的 [agentskills.io](https://agentskills.io) 开放标准已被业界主流工具采纳。核心理念：**一个 `SKILL.md`，到处运行**。

### 2.2 各平台安装路径

| 平台 | 项目级路径 | 用户全局路径 | 备注 |
|------|-----------|-------------|------|
| **Claude Code** | `.claude/skills/<name>/SKILL.md` | `~/.claude/skills/<name>/SKILL.md` | Anthropic 出品 |
| **Codex CLI** | `.agents/skills/<name>/SKILL.md` | `~/.agents/skills/<name>/SKILL.md` | OpenAI 出品 |
| **Gemini CLI** | `.gemini/skills/<name>/SKILL.md` | `~/.gemini/skills/<name>/SKILL.md` | Google 出品 |
| **GitHub Copilot** | `.github/skills/<name>/SKILL.md` | `~/.copilot/skills/<name>/SKILL.md` | GitHub 出品 |
| **Cursor** | `.cursor/skills/<name>/SKILL.md` | `~/.cursor/skills/<name>/SKILL.md` | IDE |
| **mclaw** | — | `~/.mclaw/skills/<name>/SKILL.md` | 本桌面端 |

### 2.3 SKILL.md 格式（工业标准）

```yaml
---
name: my-skill           # 必填：小写+连字符，最多64字符
description: >-          # 必填：最多1024字符。最关键字段，决定何时自动触发
  清晰描述技能功能。当用户需要 X 时使用此技能。
argument-hint: "[file]"  # 可选：参数提示
user-invocable: true     # 可选：是否显示在 / 菜单（默认 true）
disable-model-invocation: true  # 可选：禁止自动触发
allowed-tools: Read, Write, Bash  # 可选：预授权的工具
model: sonnet            # 可选：模型覆盖
context: fork            # 可选：独立子代理运行
---

# 技能标题

技能指令正文（Markdown）...
```

**渐进式加载**（三级）：
1. Level 1（~100 tokens）：`name` + `description`，启动时始终加载
2. Level 2（<5000 tokens）：`SKILL.md` 正文，触发时才加载
3. Level 3（无限制）：`references/` `scripts/` 文件，按需加载

---

## 三、方案设计

### 3.1 总体思路

**让 mclaw 的 SkillHub 成为 Skills 的"分发中心"**：用户在 mclaw 市场浏览、搜索 Skills → 一键导出/安装到任意平台。

### 3.2 方案一：后端导出 API（推荐优先实现）

**新增 API 端点**：

```
GET /api/v1/skills/:id/export?format=md      → 返回 SKILL.md 纯文本
GET /api/v1/skills/:id/export?format=zip      → 返回完整目录的 zip 包
GET /api/v1/skills/:id/export?format=json     → 返回结构化 JSON（供 CLI 工具消费）
```

**后端逻辑**（在 `backend/biz/skill/usecase/` 新增 `ExportSkill` 方法）：
1. 从数据库读取 skill 记录（name, skill_id, description, content, tags, version）
2. 生成 YAML frontmatter：
   ```yaml
   ---
   name: {skill.skill_id}
   description: {skill.description}
   metadata:
     author: mclaw-skillhub
     version: {latest_version}
     tags: {skill.tags}
   ---
   ```
3. 拼接 `content` 字段作为正文
4. 返回完整 `SKILL.md`

**优点**：简单直接，不依赖 Electron；纯 Web API，任何 CLI 工具都能调用

### 3.3 方案二：Web 前端导出按钮

在技能详情页（`SkillDetail`）和卡片（`SkillCard`）加导出按钮：

```
[安装到 Claude Code] [安装到 Codex] [下载 SKILL.md]
```

用户体验：
1. 点击目标平台
2. 前端调导出 API 获取 SKILL.md 内容
3. 浏览器下载文件到本地

**安装指令提示**（弹窗或 Toast）：
```bash
# 安装到 Claude Code（项目级）
mkdir -p .claude/skills/my-skill
mv ~/Downloads/my-skill.md .claude/skills/my-skill/SKILL.md

# 安装到 Codex（用户级）
mkdir -p ~/.agents/skills/my-skill
mv ~/Downloads/my-skill.md ~/.agents/skills/my-skill/SKILL.md
```

### 3.4 方案三：CLI 一键安装工具（进阶）

开发 `mclaw-skill` CLI 工具（可选，用 Node.js 或 Python 写）：

```bash
# 从 SkillHub 安装
npx mclaw-skill install my-skill --target claude-code

# 列出可安装的技能
npx mclaw-skill search "搜索关键词"

# 安装到所有支持的平台
npx mclaw-skill install my-skill --target all

# 从本地 SKILL.md 安装到指定平台
npx mclaw-skill link ./my-skill/SKILL.md --target codex
```

**工作原理**：
1. 调 SkillHub API `GET /api/v1/skills/:id/export?format=json` 获取技能数据
2. 根据 `--target` 参数确定目标目录（`.claude/skills/` / `.agents/skills/` 等）
3. 创建 `目标目录/<skill-name>/SKILL.md`（如果已有则更新）
4. 自动检测已安装的平台（检查目录是否存在）

### 3.5 方案四：Marketplace-to-Local 自动同步（电子端集成）

在 mclaw Electron 端实现真正的"安装"功能：

1. 用户浏览 SkillHub → 点击"安装"
2. Electron 调 API 获取 SKILL.md
3. 写入 `~/.mclaw/skills/<name>/SKILL.md`
4. 同时创建符号链接到其他已检测到的平台目录：
   ```bash
   # ~/.mclaw/skills/my-skill 是主副本
   ln -s ~/.mclaw/skills/my-skill ~/.agents/skills/my-skill
   ln -s ~/.mclaw/skills/my-skill ~/.claude/skills/my-skill
   ```

**优点**：用户只需点一下，自动跨平台就绪；mclaw 作为管理中心

---

## 四、推荐实施路线

### 阶段 1：API 导出（1-2 天，后端）

- [ ] 新增 `GET /api/v1/skills/:id/export?format=md` 端点
- [ ] 后端 `ExportSkill` usecase（数据库 → SKILL.md 转换）
- [ ] YAML frontmatter 生成器

### 阶段 2：Web 端导出按钮（1 天，前端）

- [ ] 技能详情页加"导出"按钮组
- [ ] 下载 SKILL.md 文件
- [ ] 安装指引弹窗

### 阶段 3：CLI 工具（2-3 天，可选）

- [ ] `mclaw-skill` npm 包
- [ ] `install` / `search` / `link` 命令
- [ ] 自动检测已安装平台

### 阶段 4：Electron 深度集成（2-3 天，可选）

- [ ] 一键安装到本地 skills 目录
- [ ] 多平台符号链接管理
- [ ] 安装/卸载/更新管理面板

---

## 五、关键技术细节

### 5.1 数据库 Skill → SKILL.md 转换规则

| 数据库字段 | SKILL.md 映射 |
|-----------|--------------|
| `skill_id` | `name`（frontmatter） |
| `description` | `description`（frontmatter） |
| `tags` | `metadata.tags` |
| `categories` | `metadata.categories` |
| `icon` | `metadata.emoji` |
| `content` | 正文（直接拼接） |

### 5.2 版本管理

- 默认导出**最新已发布版本**（`status = 'published'`）
- 可指定版本：`GET /api/v1/skills/:id/export?version=1.2.0`
- 从 `skill_versions` 表取对应版本的 `content`

### 5.3 安全考虑

- 导出端点使用 `auth.Auth()`（需要登录）或 `auth.Check()`（可选登录）
- 已发布的技能可以公开导出（无需登录），草稿需要作者权限
- 不在导出的 SKILL.md 中包含内部 ID 或敏感信息

### 5.4 许可证

- 技能作者可以在创建时指定许可证（MIT/Apache-2.0/CC-BY-4.0 等）
- 导出时包含 `license` frontmatter 字段
- mclaw 技能市场需要增加 `license` 字段到 `skills` 表

---

## 六、总结

mclaw 的 Skills 系统**已经有很好的跨平台基础**（Electron 端已扫描 `~/.agents/skills/` 等标准目录），但缺少从市场到文件系统的"最后一公里"。

**核心工作就是一件事：把数据库里的技能记录转换成符合 Agent Skills 开放标准的 `SKILL.md` 文件。**

优先实现方案一（后端导出 API）+ 方案二（前端下载按钮），让用户可以手动安装技能到任意平台。后续再考虑 CLI 工具和 Electron 深度集成。
