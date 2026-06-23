# BMAD Method 使用指南

> 项目：ooh-manus | BMAD 版本：6.0.4 | 安装日期：2026-03-01

---

## 一、BMAD 是什么

BMAD（Build More Architect Dreams）是一个 **AI 驱动的敏捷开发方法论框架**，通过 Claude Code 的斜杠命令系统，提供覆盖完整产品开发生命周期的结构化工作流。

核心特点：
- **11 个专业 AI Agent**，各有人格和专业领域
- **42 个斜杠命令**，覆盖从头脑风暴到代码审查的全流程
- **4 个开发阶段**：分析 → 规划 → 方案设计 → 实施
- **自适应复杂度**：从小 Bug 修复到企业级系统自动调整深度

---

## 二、目录结构

```
项目根目录/
├── _bmad/                    # BMAD 核心（不要手动修改）
│   ├── _config/              #   安装配置和清单
│   ├── _memory/              #   Agent 持久化记忆
│   ├── core/                 #   核心模块（引擎、通用工具）
│   └── bmm/                  #   BMM 模块（完整 SDLC 工作流）
│       ├── agents/           #     9 个业务 Agent 定义
│       ├── workflows/        #     所有工作流文件
│       └── config.yaml       #     模块配置
├── _bmad-output/             # BMAD 工作流输出目录
│   ├── planning-artifacts/   #   规划阶段产出（PRD、架构、Epics）
│   └── implementation-artifacts/ # 实施阶段产出（Story、Sprint）
└── .claude/commands/         # 斜杠命令注册文件（42 个）
```

---

## 三、核心概念

### Agent（智能体）

每个 Agent 是一个有专业角色和人格的 AI 助手：

| Agent | 代号 | 角色 | 何时使用 |
|-------|------|------|---------|
| Mary | 📊 analyst | 商业分析师 | 需求分析、市场研究、领域研究 |
| John | 📋 pm | 产品经理 | PRD 编写、Epics/Stories 拆分 |
| Sally | 🎨 ux-designer | UX 设计师 | UX 设计规范 |
| Winston | 🏗️ architect | 架构师 | 技术架构设计、实施就绪检查 |
| Bob | 🏃 sm | Scrum Master | Sprint 规划、Story 创建、回顾 |
| Amelia | 💻 dev | 开发者 | Story 开发、代码审查 |
| Quinn | 🧪 qa | QA 工程师 | 自动化测试生成 |
| Barry | 🚀 quick-flow | 快速开发者 | 快速规格/快速开发（小任务） |
| Paige | 📚 tech-writer | 技术写作者 | 文档编写、图表生成 |

### 工作流（Workflow）

工作流是结构化的多步骤流程，由命令触发、Agent 引导执行。每个工作流按步骤与你交互，逐步产出文档。

### 阶段（Phase）

BMAD 将产品开发分为 4 个阶段，部分步骤标记为 **必须（required）**，未完成不能进入下一阶段。

---

## 四、快速上手

### 不知道该干嘛？

```
/bmad-help
```

这是万能入口。它会分析当前项目状态，告诉你：
- 已完成哪些步骤
- 下一步该做什么
- 哪些是可选、哪些是必须

### 已有项目（Brownfield）快速路线

对于已有代码库，推荐以下顺序：

```bash
# 1. 生成项目文档（扫描代码库，生成架构/API/数据模型文档）
/bmad-bmm-document-project

# 2. 生成项目上下文（给 AI Agent 用的精简版项目摘要）
/bmad-bmm-generate-project-context

# 3. 做具体小任务时用快速流程
/bmad-bmm-quick-spec    # 写技术规格
/bmad-bmm-quick-dev     # 快速实施
```

### 新项目（Greenfield）完整路线

```bash
# 阶段 1：分析
/bmad-brainstorming              # 头脑风暴（可选）
/bmad-bmm-market-research        # 市场研究（可选）
/bmad-bmm-create-product-brief   # 产品简报（可选）

# 阶段 2：规划（PRD 必须）
/bmad-bmm-create-prd             # 创建 PRD ★必须
/bmad-bmm-validate-prd           # 验证 PRD（推荐）
/bmad-bmm-create-ux-design       # UX 设计（可选）

# 阶段 3：方案设计（全部必须）
/bmad-bmm-create-architecture    # 架构设计 ★必须
/bmad-bmm-create-epics-and-stories  # 拆分 Epics/Stories ★必须
/bmad-bmm-check-implementation-readiness  # 就绪检查 ★必须

# 阶段 4：实施（Sprint 循环）
/bmad-bmm-sprint-planning        # Sprint 规划 ★必须
/bmad-bmm-create-story           # 创建 Story ★必须
/bmad-bmm-dev-story              # 开发 Story ★必须
/bmad-bmm-code-review            # 代码审查（推荐）
/bmad-bmm-retrospective          # 回顾总结（可选）
```

---

## 五、全部命令速查

### 工作流命令（24 个）

| 命令 | 阶段 | 功能 |
|------|------|------|
| `/bmad-bmm-create-product-brief` | 1-分析 | 协作式产品简报 |
| `/bmad-bmm-market-research` | 1-分析 | 市场竞品研究 |
| `/bmad-bmm-domain-research` | 1-分析 | 领域深度研究 |
| `/bmad-bmm-technical-research` | 1-分析 | 技术可行性研究 |
| `/bmad-bmm-create-prd` | 2-规划 | 创建 PRD |
| `/bmad-bmm-validate-prd` | 2-规划 | 验证 PRD |
| `/bmad-bmm-edit-prd` | 2-规划 | 编辑 PRD |
| `/bmad-bmm-create-ux-design` | 2-规划 | 创建 UX 设计 |
| `/bmad-bmm-create-architecture` | 3-方案 | 架构设计 |
| `/bmad-bmm-create-epics-and-stories` | 3-方案 | 拆分 Epics/Stories |
| `/bmad-bmm-check-implementation-readiness` | 3-方案 | 就绪检查 |
| `/bmad-bmm-sprint-planning` | 4-实施 | Sprint 规划 |
| `/bmad-bmm-sprint-status` | 4-实施 | Sprint 状态 |
| `/bmad-bmm-create-story` | 4-实施 | 创建 Story 详情 |
| `/bmad-bmm-dev-story` | 4-实施 | 开发 Story |
| `/bmad-bmm-code-review` | 4-实施 | 代码审查 |
| `/bmad-bmm-correct-course` | 随时 | 重大变更管理 |
| `/bmad-bmm-retrospective` | 4-实施 | 回顾总结 |
| `/bmad-bmm-quick-spec` | 随时 | 快速技术规格 |
| `/bmad-bmm-quick-dev` | 随时 | 快速开发 |
| `/bmad-bmm-document-project` | 随时 | 项目文档化 |
| `/bmad-bmm-generate-project-context` | 随时 | 生成项目上下文 |
| `/bmad-bmm-qa-generate-e2e-tests` | 随时 | 生成 E2E 测试 |

### Agent 命令（10 个）

加载特定 Agent 角色，用于非命令式的自由对话：

| 命令 | Agent |
|------|-------|
| `/bmad-agent-bmad-master` | BMad Master（总控） |
| `/bmad-agent-bmm-analyst` | Mary（分析师） |
| `/bmad-agent-bmm-architect` | Winston（架构师） |
| `/bmad-agent-bmm-dev` | Amelia（开发者） |
| `/bmad-agent-bmm-pm` | John（产品经理） |
| `/bmad-agent-bmm-qa` | Quinn（QA） |
| `/bmad-agent-bmm-quick-flow-solo-dev` | Barry（快速开发） |
| `/bmad-agent-bmm-sm` | Bob（Scrum Master） |
| `/bmad-agent-bmm-tech-writer` | Paige（技术写作） |
| `/bmad-agent-bmm-ux-designer` | Sally（UX 设计师） |

### 通用工具命令（8 个）

| 命令 | 功能 |
|------|------|
| `/bmad-help` | 分析状态，建议下一步 |
| `/bmad-brainstorming` | 交互式头脑风暴 |
| `/bmad-party-mode` | 多 Agent 群聊讨论 |
| `/bmad-editorial-review-prose` | 文案风格审查 |
| `/bmad-editorial-review-structure` | 文档结构审查 |
| `/bmad-review-adversarial-general` | 对抗性批判审查 |
| `/bmad-review-edge-case-hunter` | 边界用例审查 |
| `/bmad-index-docs` | 生成文档索引 |
| `/bmad-shard-doc` | 大文档拆分 |

---

## 六、使用技巧

### 1. 每个工作流在新对话窗口运行

BMAD 工作流会占用大量上下文窗口。**每次执行工作流时，建议开一个新的 Claude Code 对话**，避免上下文溢出。

### 2. 验证类工作流换模型跑

`/bmad-bmm-validate-prd` 和 `/bmad-bmm-check-implementation-readiness` 等验证工作流，建议用**不同的高质量 LLM** 执行，避免同一个模型"自己验证自己"。

### 3. YOLO 模式

在工作流执行过程中，当出现确认提示时选择 `[y] YOLO`，将跳过后续所有确认，自动模拟专家用户完成剩余步骤。适合你对流程已经熟悉、想快速出结果的场景。

### 4. Party Mode

`/bmad-party-mode` 可以让多个 Agent 在同一个对话中讨论问题，类似"头脑风暴会议"。适合需要多角度分析的场景。

### 5. 产出文件位置

| 阶段 | 输出路径 |
|------|---------|
| 规划（PRD/架构/UX/Epics） | `_bmad-output/planning-artifacts/` |
| 实施（Sprint/Story） | `_bmad-output/implementation-artifacts/` |
| 项目文档 | `docs/`（由 `project_knowledge` 配置决定） |

---

## 七、配置说明

### 主配置文件

`_bmad/bmm/config.yaml`：

```yaml
project_name: ooh-manus                    # 项目名
user_skill_level: intermediate             # 用户技能等级（影响交互深度）
planning_artifacts: "{project-root}/_bmad-output/planning-artifacts"
implementation_artifacts: "{project-root}/_bmad-output/implementation-artifacts"
project_knowledge: "{project-root}/docs"   # 现有文档位置
user_name: Daodao
communication_language: English            # 交互语言
document_output_language: English          # 输出文档语言
output_folder: _bmad-output
```

### 可修改的配置项

| 配置项 | 说明 | 建议 |
|--------|------|------|
| `communication_language` | Agent 与你的对话语言 | 改为 `Chinese` 让 Agent 用中文交互 |
| `document_output_language` | 输出文档的语言 | 按需改为 `Chinese` |
| `user_skill_level` | 影响交互深度 | `beginner` / `intermediate` / `expert` |
| `project_knowledge` | 现有文档路径 | 指向项目的文档目录 |

### Agent 自定义

每个 Agent 都有自定义文件：`_bmad/_config/agents/{agent-name}.customize.yaml`

可以自定义：
- Agent 名称和人格
- 行为和操作偏好
- 持久化记忆
- 自定义菜单项

当前全部为空模板，按需填写即可。

---

## 八、本地快速安装（从已有项目复制）

> 适用场景：本地已有一个安装过 BMAD 的项目（如 ooh-manus），想在其他项目中快速安装，无需再跑 `npx bmad-method install`。

### 前提条件

- 本地已有一个完整安装过 BMAD v6 的源项目（以下以 `ooh-manus` 为例）
- 源项目路径：`/Volumes/nidao003/Mactext/ooh/ooh-stationmatch/ooh-manus`

### 安装步骤

#### 第 1 步：复制三组文件

```bash
# 设置变量（按实际路径修改）
SOURCE="/Volumes/nidao003/Mactext/ooh/ooh-stationmatch/ooh-manus"
TARGET="/path/to/your/project"   # 替换为目标项目路径

# 1. 复制 BMAD 核心目录
cp -R "$SOURCE/_bmad" "$TARGET/_bmad"

# 2. 复制斜杠命令文件（42 个）
mkdir -p "$TARGET/.claude/commands"
cp "$SOURCE/.claude/commands/bmad-"* "$TARGET/.claude/commands/"

# 3. 创建输出目录
mkdir -p "$TARGET/_bmad-output/planning-artifacts"
mkdir -p "$TARGET/_bmad-output/implementation-artifacts"
```

#### 第 2 步：修改配置文件

编辑 `_bmad/bmm/config.yaml`，修改以下字段：

```yaml
# 必须修改
project_name: 你的项目名          # 改为当前项目名称

# 按需修改
user_name: YourName              # 你的名字
communication_language: Chinese   # Agent 交互语言（English / Chinese）
document_output_language: Chinese # 输出文档语言（English / Chinese）
user_skill_level: intermediate   # beginner / intermediate / expert
```

其他配置项（`planning_artifacts`、`implementation_artifacts`、`project_knowledge`、`output_folder`）使用 `{project-root}` 相对路径，通常无需修改。

#### 第 3 步：清理源项目的记忆数据（可选）

复制过来的 `_bmad/_memory/` 目录可能包含源项目的 Agent 记忆。如果不需要：

```bash
# 清空记忆目录（保留目录结构）
rm -f "$TARGET/_bmad/_memory/"*.md 2>/dev/null
```

#### 第 4 步：验证安装

```bash
# 检查核心目录
ls "$TARGET/_bmad/"
# 应看到：_config  _memory  bmm  core

# 检查命令文件数量
ls "$TARGET/.claude/commands/bmad-"* | wc -l
# 应输出：42

# 检查配置
cat "$TARGET/_bmad/bmm/config.yaml"
# 确认 project_name 已改为当前项目名
```

验证通过后，在 Claude Code 中使用 `/bmad-help` 即可开始。

### 与 npx 安装的区别

| 对比项 | `npx bmad-method install` | 本地复制 |
|--------|--------------------------|---------|
| 需要网络 | 是 | 否 |
| 交互式配置 | 是（终端 UI） | 手动编辑 config.yaml |
| 安装速度 | 较慢（下载 + 安装） | 秒级（本地复制） |
| 版本一致性 | 始终最新 | 与源项目版本一致 |
| 适用场景 | 首次安装、升级 | 快速在多个项目间部署 |

> **注意**：本地复制的版本与源项目一致。如需升级到最新版本，仍需使用 `npx bmad-method@latest install`。

---

## 九、升级指南

### 查看当前版本

当前安装版本信息在 `_bmad/_config/manifest.yaml`：

```yaml
installation:
  version: 6.0.4
```

### 升级步骤

**前提条件**：Node.js v20+

```bash
# 1. 进入项目根目录
cd /Volumes/nidao003/Mactext/ooh/ooh-stationmatch/ooh-manus

# 2. 执行升级命令（会自动检测现有安装并升级）
npx bmad-method install

# 如果 npx 缓存了旧版本，指定最新版本号
npx bmad-method@latest install
```

安装器会：
1. 检测到 `_bmad/` 目录已存在
2. 对比 `_config/files-manifest.csv` 中的 SHA256 哈希值，识别变更文件
3. 保留你的自定义配置（`_config/agents/*.customize.yaml`、`_memory/` 等）
4. 更新核心文件和工作流
5. 更新 `.claude/commands/` 中的命令文件

### 升级前注意事项

1. **备份自定义配置**：如果你修改过 `_bmad/_config/agents/` 下的自定义文件，建议先备份
2. **备份记忆文件**：`_bmad/_memory/` 目录包含 Agent 记忆，升级通常会保留
3. **检查 changelog**：升级前查看官方 changelog 了解破坏性变更
4. **产出文件不受影响**：`_bmad-output/` 和 `docs/` 中的产出文件不会被升级覆盖

### 版本管理策略

`_bmad/` 目录和 `.claude/commands/` 目录都应该纳入 git 版本控制，这样：
- 团队成员 clone 后直接可用
- 升级后可以通过 `git diff` 查看变更
- 出问题可以回滚

### 官方资源

| 资源 | 链接 |
|------|------|
| GitHub 仓库 | https://github.com/bmad-code-org/BMAD-METHOD |
| 官方文档 | https://docs.bmad-method.org |
| 升级指南 | https://docs.bmad-method.org/how-to/upgrade-to-v6/ |
| NPM 包 | https://www.npmjs.com/package/bmad-method |
| Discord 社区 | https://discord.gg/gk8jAdXWmj |
| 路线图 | https://docs.bmad-method.org/roadmap/ |

### 可用扩展模块

升级时或安装后可以添加额外模块：

| 模块 | 代号 | 功能 |
|------|------|------|
| BMad Builder | BMB | 创建自定义 Agent 和工作流 |
| Test Architect | TEA | 风险驱动测试策略和自动化 |
| Game Dev Studio | BMGD | 游戏开发工作流（Unity/Unreal/Godot） |
| Creative Intelligence Suite | CIS | 创新思维、设计思维 |

安装扩展模块：

```bash
npx bmad-method install --modules bmm,tea
```

---

## 十、常见问题

### Q: 执行命令后没反应？
确保在 Claude Code 中运行，且 `.claude/commands/` 目录下有对应的命令文件。

### Q: 工作流执行到一半断了怎么办？
部分工作流（如 `/bmad-bmm-document-project`）支持断点恢复。重新执行同一命令，它会检测到上次的状态文件并提示恢复。

### Q: 想改交互语言为中文？
编辑 `_bmad/bmm/config.yaml`，将 `communication_language` 改为 `Chinese`。

### Q: 输出的文档在哪？
- 规划阶段产物：`_bmad-output/planning-artifacts/`
- 实施阶段产物：`_bmad-output/implementation-artifacts/`
- 项目文档：`docs/`（取决于 `project_knowledge` 配置）
