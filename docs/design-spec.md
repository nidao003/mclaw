# mclaw 视觉设计规范 (Design Spec)

> 本文档记录 mclaw 桌面端的视觉设计原则、配色体系、组件约定和实现细节。
> Skills Hub Web 端专门规范见 `docs/skills-hub-DESIGN.md`。
> 任何对 UI 的改动都应先回看本规范，保持视觉语言统一。

---

## 1. 视觉气质

- **关键词**：温暖、柔和、现代、克制、卡通友好
- **灵感来源**：`docs/projects/assets/` 下的 UI 设计图（QClaw 原型）
- **设计参考**：
  - 浅色卡片 + 温暖奶油色侧边栏（不要用纯黑/纯灰）
  - 圆角偏大、阴影柔和、过渡自然
  - 强调"工具感"+"亲和力" — 不冷冰，不浮夸

> ⚠️ 设计参考图（HTML 原型）与 mclaw 实际项目**结构和命名不完全一致**，仅作为视觉语言参考，不直接照搬布局。

---

## 2. 主题色

| 用途 | Token | 色值 | 备注 |
|------|-------|------|------|
| 品牌主色 | `brand` | `#EE7C4B` | 暖珊瑚橙，所有 CTA / 激活态 |
| 品牌 hover | `brand-hover` | `#D95A2B` | 按钮 hover / active |
| 品牌暗模式 | (dark mode 自动) | `#F5976B` | 暗色模式自动加亮 |

> 🚨 **不要改主题色为红色或其他颜色**。本次美化明确要求"保持主题色橙色不变"。

### 主题色的使用规则

```tsx
// ✅ 推荐：使用 Tailwind 工具类
<Button variant="default" />              // 橙色渐变 CTA
<Badge variant="brand-soft" />            // 橙色淡背景徽章
<div className="bg-brand/10 text-brand" /> // 通用品牌色

// ❌ 不推荐：硬编码颜色
<div style={{ background: '#EE7C4B' }} />
```

---

## 3. 配色体系

### 3.1 浅色模式（默认）

| Token | HSL | 实际色 | 用途 |
|-------|-----|--------|------|
| `--background` | (来自 globals.css) | 浅米白 | 应用主背景 |
| `--surface-modal` | `0 0% 100%` | 纯白 | 卡片、弹窗 |
| `--surface-input` | `30 5% 93%` | 米白 | 输入框、代码块 |
| `--surface-sidebar` | `30 25% 97%` | **温暖奶油** | 左侧导航栏 |
| `--sidebar-foreground` | `240 6% 12%` | 深石板灰 | 侧边栏文字 |
| `--sidebar-foreground-muted` | `240 4% 38%` | 中灰 | 侧边栏次要文字 |
| `--sidebar-hover` | `30 20% 93%` | 浅米 | 导航项 hover |
| `--sidebar-active` | `18 81% 62%` | 品牌橙 | 激活项左边框 |

### 3.2 暗色模式

| Token | HSL | 实际色 | 用途 |
|-------|-----|--------|------|
| `--surface-sidebar` | `20 14% 9%` | 暖深棕 | 暗色侧边栏（**不再用冷蓝灰**） |
| `--sidebar-foreground` | `30 5% 93%` | 浅米 | 暗色侧边栏文字 |
| `--sidebar-hover` | `20 14% 16%` | 暖灰 | 暗色导航项 hover |

### 3.3 透明度工具类

`tailwind.config.js` 中只支持 `bg-brand/100` 等 0-100 的整除透明度。本项目通过 `globals.css` 补了非整除值：

| 工具类 | 实际透明度 | 用途 |
|--------|-----------|------|
| `bg-brand/8` | 0.08 | 卡片微弱背景 |
| `bg-brand/12` | 0.12 | 导航项激活背景 |
| `bg-brand/15` | 0.15 | 徽章背景 |
| `bg-brand/18` | 0.18 | hover 加深 |
| `bg-brand/22` | 0.22 | hover 加深（深色模式） |

---

## 4. 圆角系统

| 名称 | 数值 | 用途 |
|------|------|------|
| `rounded-md` | 6px | 徽章、小标签 |
| `rounded-lg` | 8-12px | **按钮、输入框**（默认推荐） |
| `rounded-xl` | 12px | 列表项 |
| `rounded-2xl` | 16px | **卡片、欢迎屏 hero**（推荐） |
| `rounded-full` | 9999px | 头像、胶囊按钮、徽章 |

---

## 5. 阴影系统

| 场景 | 阴影 | Tailwind |
|------|------|----------|
| 卡片默认 | 0 1px 2px | `shadow-sm` |
| 卡片 hover | 0 4px 12px + translateY(-2px) | `.card-hover` |
| 按钮 hover | 0 4px 12px | `shadow-md` |
| 弹窗/抽屉 | 0 10px 30px | `shadow-xl` |
| 输入框聚焦 | `0 0 0 3px hsl(18 81% 62% / 0.15)` | `.input-brand-focus` |

---

## 6. 核心组件规范

### 6.1 Button (`src/components/ui/button.tsx`)

```tsx
<Button variant="default" size="default" />  // 橙色渐变 CTA（主操作）
<Button variant="soft" />                     // 橙色淡背景（次操作）
<Button variant="brand" />                    // 橙色描边（次要 CTA）
<Button variant="outline" />                  // 通用描边
<Button variant="ghost" />                    // 无背景，仅 hover
<Button variant="destructive" />              // 危险操作
<Button variant="link" />                     // 文本链接
```

**圆角**：`rounded-lg`（12px），**比 shadcn 默认的 `rounded-md` 更大**。
**交互**：`hover` 时阴影变 `shadow-md`，`active` 时 `translate-y-px` 模拟按下。

### 6.2 Card (`src/components/ui/card.tsx`)

- 圆角：`rounded-2xl`（16px）
- 阴影：`shadow-sm`，hover 升级为 `.card-hover`
- 间距：`p-6`（Header/Content/Footer）
- 新增 `CardAction`：用于卡片右上角动作区

### 6.3 Badge (`src/components/ui/badge.tsx`)

| 变体 | 用途 |
|------|------|
| `default` | 主色徽章 |
| `brand` | 橙色实心背景，浅色文字 |
| `brand-soft` | 橙色淡背景 + 描边，**最常用**（导航项 badge） |
| `secondary` / `destructive` | 通用语义 |
| `success` / `warning` | 状态色 |

---

## 7. 布局规范

### 7.1 整体架构

```
┌─────────────────────────────────────────────────────┐
│  TitleBar (Windows)                                 │  h-10
├──────────────┬──────────────────────────────────────┤
│              │                                      │
│  Sidebar     │  Main Content                        │
│  (240px)     │  - 圆角主区，无圆角内嵌                │
│  浅奶油色     │  - p-6 内边距                         │
│              │  - 滚动溢出                           │
│  - 顶部 Logo  │                                      │
│  - 新建对话  │                                      │
│  - 导航项    │                                      │
│  - 历史会话  │                                      │
│  - 底部设置  │                                      │
│              │                                      │
└──────────────┴──────────────────────────────────────┘
```

### 7.2 侧边栏设计

- **背景**：`bg-surface-sidebar`（浅奶油）
- **Logo 区**：橙色渐变方块包裹 logo + 文字
- **新建对话按钮**：橙色渐变 CTA，主操作
- **导航项**：
  - 圆角 `rounded-lg` (12px)
  - hover：浅米色背景 + 文字加深
  - 激活：橙色左边框 (`box-shadow: inset 2px 0 0 #EE7C4B`) + 品牌色淡背景
- **历史会话**：
  - 分组标题用 `text-tiny text-sidebar-muted`
  - 单项 hover 显示重命名/删除按钮
  - 当前会话高亮为 `bg-brand/10 text-brand`

### 7.3 标题栏（Windows）

- 三个按钮组（最小化/最大化/关闭）
- 圆角 `rounded-md` (8px)
- 悬停时浅色背景，关闭按钮悬停变红 `#E11D48`

---

## 8. 动效约定

| 场景 | 时长 | 缓动 |
|------|------|------|
| 颜色/背景变化 | `duration-200` | ease |
| 阴影变化 | `duration-200` | ease |
| 浮起（hover -translate） | `duration-200` | ease |
| 渐入（空状态） | `0.4s` | ease-out |
| 按钮按下 | `active:translate-y-px` | 即时 |

CSS 工具类：
- `.card-hover` — 卡片悬停浮起
- `.nav-item-smooth` — 导航项平滑过渡
- `.input-brand-focus` — 输入框聚焦品牌色光环
- `.titlebar-btn` / `.titlebar-btn-close` — 标题栏按钮
- `.animate-fade-up` + `animate-fade-up-delay-{1..4}` — 渐入动画

---

## 9. 国际化与无障碍

- 侧边栏导航使用 `useTranslation` 提取文案
- 所有交互元素需有 `aria-label`（特别是图标按钮）
- 文字对比度：浅色模式下文字与背景对比度 ≥ 4.5:1

---

## 10. 反模式（不要做的事）

| ❌ 错误 | ✅ 正确 |
|--------|--------|
| 用纯黑 `#000` 做侧边栏 | 用 `bg-surface-sidebar`（浅奶油） |
| 硬编码 `#EE7C4B` | 用 `bg-brand` / `text-brand` |
| 圆角 `rounded-md` 用于按钮 | 用 `rounded-lg`（更柔和） |
| 阴影太重 (`shadow-2xl`) | 默认 `shadow-sm`，hover 升 `shadow-md` |
| emoji 作为功能图标 | 用 `lucide-react` 线性图标 |
| 冷蓝灰侧边栏（HSL 240） | 用暖色调（H 20~30） |
| 在 light 模式用 `dark:bg-card` 双声明 | 用 surface token，自动适配 |

---

## 11. 文件结构

```
src/
├── styles/globals.css                 # CSS 变量 + 自定义工具类
├── components/
│   ├── ui/                            # 基础 UI 组件（Card/Button/Badge…）
│   └── layout/                        # MainLayout / Sidebar / TitleBar
├── pages/Chat/index.tsx               # Chat 页（含 WelcomeScreen）
└── …
tailwind.config.js                    # brand / sidebar / surface 颜色 token
docs/design-spec.md                    # 本文件
```

---

## 12. Web / Skills Hub 规范

Web 端专门规范独立维护在 `docs/skills-hub-DESIGN.md`。当前 Web 风格参考 `https://skillhub.cn`：白色画布、蓝色强调、黑色胶囊 CTA、圆形搜索条、纵向技能流。

---

## 13. 改动记录

| 日期 | 改动 | 涉及文件 |
|------|------|----------|
| 2026-06-09 | 侧边栏从冷蓝灰深色改为温暖奶油浅色；升级 Card/Button/Badge；优化 Windows 标题栏；新增 Chat 欢迎屏 4 张能力卡片 | `tailwind.config.js`, `globals.css`, `card.tsx`, `button.tsx`, `badge.tsx`, `Sidebar.tsx`, `MainLayout.tsx`, `TitleBar.tsx`, `Chat/index.tsx` |
| 2026-06-12 | Web 端更新为 skillhub.cn 风格，并新增专门规范 `docs/skills-hub-DESIGN.md` | `apps/web/index.html`, `apps/web/tailwind.config.js`, `apps/web/src/styles/globals.css`, `apps/web/src/pages/`, `packages/shared/src/components/`, `docs/design-spec.md`, `docs/skills-hub-DESIGN.md` |

---

## 14. 参考资料

- 设计图：`docs/projects/assets/*.png`
- 设计规范原稿：`docs/projects/DESIGN.md`（QClaw 原型规范）
- Web 端专门规范：`docs/skills-hub-DESIGN.md`
- Web 参考站：https://skillhub.cn
- shadcn/ui 基础：https://ui.shadcn.com/
- Tailwind CSS：https://tailwindcss.com/
