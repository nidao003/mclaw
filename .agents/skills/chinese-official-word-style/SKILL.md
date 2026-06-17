---
name: chinese-official-word-style
slug: chinese-official-word-style
version: 1.0.0
description: Create or revise Chinese external-facing Word documents in a formal 公文/对公交流 style. Use when preparing .docx business explanation notes, consultation framework descriptions, official-looking reports, practice reports, client communication drafts, or Chinese enterprise documents that should avoid AI-like proposal cards, colorful brief layouts, excessive tables, marketing language, or over-designed formatting.
icon: 📄
author: mclaw
tags:
  - 文档
  - 公文
  - Word
  - 中文
  - 排版
  - docx
---

# Chinese Official Word Style

Use this skill to make Chinese Word documents feel like formal external communication materials rather than AI-generated business briefs.

## Core Rule

Prefer a restrained A4 公文/报告 style:

- Centered black title.
- Optional centered subtitle such as "商务沟通稿".
- Body organized by `一、` `（一）` `1、`.
- Songti/Heiti typography, black text, no accent colors.
- Natural paragraphs with first-line indent.
- Tables only when the content is genuinely tabular.
- No cards, colored callouts, marketing hero blocks, icon labels, gradient accents, or decorative section furniture.

## Workflow

1. Read any sample Word documents or user-provided templates first.
2. Extract the visible convention: title placement, heading levels, font family, font size, line spacing, margins, table use, and numbering style.
3. Draft the document as an official explanation, notice, report outline, or communication note.
4. Remove AI-sounding sections such as "项目理解", "合作价值", "沟通阶段建议", unless the user explicitly asks for them.
5. Keep deliverables grouped in the Word/PPT body unless the user asks for separate appendices or files.
6. Render the DOCX and visually inspect pages before final delivery when document tools are available.

## Default Layout Tokens

Use these defaults unless the sample document or user instruction says otherwise:

- Page: A4 portrait.
- Margins: about 2.7 cm top/bottom, about 2.6-2.8 cm left/right.
- Title: centered, black, SimHei or SimSun bold, 18 pt.
- Subtitle/metadata: centered, SimSun, 12 pt.
- Level 1 heading: `一、标题`, SimHei or SimSun bold, 15 pt, left aligned.
- Level 2 heading: `（一）标题`, SimHei or SimSun bold, 14 pt, left aligned.
- Level 3 heading: `1、标题`, SimSun bold, 12 pt.
- Body: SimSun, 12 pt, 1.5 line spacing, first-line indent 2 Chinese characters.
- Paragraph spacing: minimal; rely on line spacing and heading spacing, not large blank gaps.
- Tables: plain black/gray borders, no color fills unless a formal template already uses them.

## Recommended Structure

```text
标题
（可选）商务沟通稿

一、整体框架
正文……
（一）……
（二）……

二、专题一
正文……
（一）……
（二）……

三、专题二
……

六、成果形式
（一）咨询报告 Word/PPT 版本……
（二）配套查询 Skills/API Key……
```

## Typography & Spacing

- 标题：黑体或宋体加粗，三号或小三，居中。
- 一级标题：黑体或宋体加粗，小三或四号。
- 二级标题：黑体或宋体加粗，四号。
- 正文：宋体，小四，1.5 倍行距。
- 表格：宋体，小四或五号，表头可加粗。
- 正文首行缩进 2 个中文字符。
- 正文左对齐；避免强制两端对齐造成中文字符间距被拉大。
- 段前段后保持克制，标题前后可略留空。
- 条款可以不用项目符号，优先用 `（一）` `（二）` 或 `1、`。

## Table Usage

Only use tables when:

- Cover page metadata
- Course/project/unit info
- Explicit comparison matrices
- Metrics or data tables

Do NOT use tables for regular paragraphs. Avoid colored headers, card-style three-column tables, or marketing value tables unless the user explicitly requests a proposal layout.

## Writing Guidance

Use sober, factual wording:

- Say "拟围绕……开展" instead of "打造……能力闭环".
- Say "用于支撑……分析" instead of "赋能……价值跃迁".
- Say "本说明为前期商务沟通文件，不作为正式研究结论" when scope needs a boundary.
- Avoid "核心表达", "客户可感知价值", "合作价值", "方法论闭环" unless the user asks for a proposal deck.

When content involves commercial station research, do not over-interpret 经营策略. If the user only wants data and 业态 analysis, limit the section to:

- 周边商业配套和业态分布数据.
- 不同站点类型的业态特征对比.
- 车站周边客流场景、消费服务和 POI 基础.
- 公开案例或已有资料中的业态参考.

Avoid detailed claims about 收益机制、保底租金、分成比例、招商策略、经营模式 unless explicitly requested.

## Boundary Statements

Common boundary statements for external-facing docs:

- 本说明为前期商务沟通文件，主要用于明确咨询方向和内容结构，不作为正式研究结论。
- 正式报告需在双方确认合作范围、核心车站、重点主题和数据口径后开展系统采集、分析与撰写。
- 相关支撑内容可根据报告表达需要纳入 Word 或 PPT 正文、附录或图表页中，不单独作为对外零散交付材料。

## Anti-Patterns

Avoid:

- Large blocks of blue, purple, gradients, icons, cards.
- Consulting buzzwords like "项目理解", "合作价值", "客户可感知价值" unless user asks for a business proposal.
- Forming definitive conclusions from data that hasn't been collected or signed off yet.
- Going deep into revenue models, leasing strategies, investment attraction when the user only asks for 业态 and data analysis.
