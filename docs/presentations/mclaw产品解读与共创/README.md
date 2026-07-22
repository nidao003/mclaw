# mclaw 产品解读与共创（内部 PPT）

面向公司内部的 mclaw 产品解读材料，17 页。基于 README、项目记忆、qclaw 对比文档提炼，配色用地铁橙 `#EE7C4B` 主色 + 深浅三明治结构，视觉元素全用 pptxgenjs 原生 shapes 绘制（无外部图片素材）。

## 目录结构

```
mclaw产品解读与共创/
├── build.js                          # 生成脚本（源）-- 改内容改这里
├── mclaw-产品解读与共创.pptx          # 交付物
├── mclaw-产品解读与共创.pdf           # 预览（libreoffice 转出）
├── slides/                           # 17 张 slide 预览图（jpg）
│   └── slide-01.jpg ~ slide-17.jpg
├── qa/                               # QA 留档
│   ├── slide-01.md ~ slide-17.md     # 每页 OCR 识别结果（PaddleOCR-VL）
│   ├── ocr_all.md                    # 17 页 OCR 汇总
│   ├── markitdown_full.md            # PPTX 文本层全量（markitdown 提取）
│   └── ocr_all.sh                    # 并行 OCR 一次性脚本（路径写死 /tmp，仅参考）
└── README.md                         # 本文件
```

## 17 页内容

| # | 标题 | 类型 |
|---|------|------|
| 1 | 封面 | 深色 |
| 2 | 目录（六部分） | 浅色 |
| 3 | mclaw 是什么 | 浅色 |
| 4 | 为什么需要它（痛点 vs 解法） | 浅色 |
| 5 | 核心能力全景 · 八大模块 | 浅色 |
| 6 | 地铁行业四大能力 | 浅色 |
| 7 | 产品思路 | 浅色 |
| 8 | 四个参考对象 | 浅色 |
| 9 | 三个产品决策 · 借鉴 QClaw | 浅色 |
| 10 | 技术架构 · 两端协同 | 浅色 |
| 11 | 业务流程 · 用户怎么用 | 浅色 |
| 12 | 计费模型 · 三档套餐 | 浅色 |
| 13 | 数据查询流程 | 浅色 |
| 14 | 为什么要共创 | 深色（转折页） |
| 15 | 邀你一起共创 | 浅色 |
| 16 | 现状与路线 | 浅色 |
| 17 | 结尾 | 深色 |

## 重新生成

依赖 `pptxgenjs`（全局装在 `~/.nvm/versions/node/v22.22.0/lib/node_modules`），需用 `NODE_PATH` 指过去：

```bash
export NODE_PATH=/Users/daodao/.nvm/versions/node/v22.22.0/lib/node_modules
node build.js
# 产物输出到脚本同目录：mclaw-产品解读与共创.pptx

# 转 PDF + 预览图（需 libreoffice）
soffice --headless --convert-to pdf mclaw-产品解读与共创.pptx
soffice --headless --convert-to jpg mclaw-产品解读与共创.pptx
```

改内容只需编辑 `build.js`（每页一个独立 `{ ... }` 块，顶部有 `P1`~`P17` 注释定位），重跑即可。

## QA 结论

P12 计费表 4 列配额（价格列已删，价格待定）

**OCR 识别瑕疵（非 PPT 缺陷）**：彩色圆内白字编号漏识、符号 `✕` 误识为 LaTeX `^{×}`、深色页文字漏识（P14 转变条/P01 巨字）--均为 PaddleOCR 图像识别局限，markitdown 证明 PPT 文字实际在位。

**视觉布局（未验证）**：配色协调度、元素对齐/间距、shape 图形绘制、文字是否溢出边界--这些需看图，本轮 QA 受模型禁图约束未覆盖。定稿前建议人工或 Claude Opus（视觉模型）复核 `slides/` 下 17 张预览图。

## 配色规范

| 变量 | 色值 | 用途 |
|------|------|------|
| brand | `#EE7C4B` | 地铁橙主色 |
| brandDk | `#D95A2B` | 深橙 |
| brandSf | `#F5C9B0` | 浅橙（深色页文字） |
| ink | `#1F1A17` | 深墨（深色页背景） |
| cream | `#FAF6F1` | 暖奶油（浅色页背景） |
| green/gold/blue | `#3A6B5A`/`#C9954A`/`#345B7A` | 点缀色 |
