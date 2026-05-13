# MAP — Portfolio Interaction

## 项目概览

单页交互式 Portfolio 网站。核心交互：点击 SVG 中 "portfolio" 单词的首字母 **p**，触发一条延伸线动画，随后 "ILLUSTRATION WORK" 逐字显现。

## 文件结构

```
Portfolio_web/
├── index.html          # 主页面，SVG 布局
├── script.js           # 核心逻辑：字体解析、对齐计算、动画
├── style.css           # 样式与动画
├── fonts/
│   └── PixelifySans-Regular.ttf   # 像素风格自定义字体
├── .prettierrc         # Prettier 配置
├── .prettierignore     # 忽略 CSS 格式化
└── .vscode/
    └── settings.json   # VSCode 保存时自动格式化
```

## 架构与数据流

```
index.html (SVG DOM)
  │
  ├── .char-trigger (p) ── 点击触发 handleTriggerClick()
  ├── .char-target (I)  ── 隐藏占位，用于对齐计算
  ├── .char-anim × 16   ── "ILLUSTRATION WORK" 逐字出现
  ├── .extension-line   ── 连接线 (stroke-dasharray 动画)
  └── .hint ("CLICK LETTER P")
```

### 初始化流程

```
DOMContentLoaded
  │
  ├─ 1. Promise.all 并行加载
  │     ├── opentype.js 解析字体 → 提取 p 的竖线 (stem) 数据
  │     └── opentype.js 解析字体 → 提取 I 的竖线 (stem) 数据
  │
  ├─ 2. document.fonts.ready → requestAnimationFrame
  │     └── applyStemData()  精确对齐
  │            │
  │            ├── 计算 p 竖线中心 X 和底部 Y
  │            ├── 计算 I 竖线中心偏移
  │            ├── 设置 .section-title 的 x/y（对齐 p 竖线中心）
  │            ├── 设置 .extension-line 端点
  │            └── drawDebugGuides() 调试参考线（已注释掉 parent.appendChild）
  │
  └─ 3. 失败回退 → fallbackToBBox()（使用 getBBox 粗略估算）
```

### 点击交互流程

```
点击 p (.char-trigger)
  │
  ├── 防重入检查 (isAnimating)
  ├── p 变绿色 (class="active")
  ├── extension-line 动画 700ms（stroke-dashoffset 归零，线条从上往下画出）
  │
  └── setTimeout 700ms
        └── 每个 .char-anim 添加 .show → opacity 0→1，按 --i 延迟错开出现
```

### 窗口缩放

```
window resize
  └── 如果 p 处于 active 状态 → 重新执行 applyStemData() 保持对齐
```

## 关键技术点

| 技术 | 位置 | 说明 |
|------|------|------|
| **opentype.js** | [index.html:8](index.html#L8) CDN | 解析 .ttf 字体，获取 glyph 路径命令 |
| **竖线提取** | [script.js:16-82](script.js#L16) `extractVerticalStems()` | 从路径命令中识别竖直主干线段，按 x 分组，计算宽度 |
| **字体单位 → SVG 像素** | [script.js:285](script.js#L285) | `scale = svgFontSize / unitsPerEm` |
| **基线参照** | [index.html:17](index.html#L17) `.stem-measure` | 隐藏文本 "l"，用于测量字体竖线宽度 |
| **I 占位对齐** | [index.html:39](index.html#L39) `.char-target` | `visibility: hidden`，占据空间用于 getBBox 计算 |
| **线条动画** | [style.css:103-112](style.css#L103) | stroke-dasharray/dashoffset 技术，CSS transition 700ms |
| **逐字动画** | [style.css:87-98](style.css#L87) | `transition-delay: calc(var(--i) * 0.06s)` |
| **调试参考线** | [script.js:129-271](script.js#L129) `drawDebugGuides()` | 6 层调试可视化（已注释掉挂载，取消第 270 行注释即可启用） |

## 可调参数

| 参数 | 位置 | 默认值 | 说明 |
|------|------|--------|------|
| `OFFSET_X` | [script.js:278](script.js#L278) | `0.5` | 延伸线起点 X 微调 |
| `OFFSET_Y` | [script.js:279](script.js#L279) | `-50` | 延伸线起点 Y 微调 |
| `gap` | [script.js:332](script.js#L332) | `200` | p 底部到 I 底部的垂直间距 |
| 逐字延迟 | [style.css:91](style.css#L91) | `0.06s` | 每个字母出现间隔 |
| 线条动画时长 | [style.css:108](style.css#L108) | `0.7s` | 延伸线画出速度 |

## 外部依赖

- [opentype.js 1.3.4](https://cdn.jsdelivr.net/npm/opentype.js@1.3.4/dist/opentype.min.js) — CDN 加载，用于字体 glyph 解析
