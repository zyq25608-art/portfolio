# MAP — Portfolio Interaction

## 项目概览

单页交互式 Portfolio 网站。核心交互：点击 SVG 中 "portfolio" 的首字母 **p**，p 的竖线向下生长延伸，随后 "Digital Products" 逐字显现。

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
  ├── .char-trigger (p)     ── 点击触发，竖线提取源
  ├── .char-target (D)      ── 对齐锚点，字号 72px，随动画出现
  ├── .char-anim × 15       ── "igital Products" 逐字出现
  ├── .extension-stem       ── 延伸竖线 <path>（stroke-dasharray 生长动画）
  └── .hint ("CLICK LETTER P")
```

### 初始化流程

```
DOMContentLoaded
  │
  ├─ 1. Promise.all 并行加载 p 和 D 的字形数据
  │     ├── opentype.js 解析 p 的 glyph 路径
  │     └── opentype.js 解析 D 的 glyph 路径
  │
  ├─ 2. getStemFromPath() 提取竖线
  │     └── 识别纵向线段（dx<3 && dy>10）→ 按 x 分组 → 取最左侧组
  │         → 返回 { left, right, top, bottom }（字体单位）
  │
  ├─ 3. document.fonts.ready → requestAnimationFrame
  │     └── applyStemData()
  │            │
  │            ├── 字体单位 → SVG 像素 (scale = fontSize / unitsPerEm)
  │            ├── 计算 p 的 stemLeftSVG / stemRightSVG / stemTopSVG / stemBottomSVG
  │            ├── 创建延伸 <path>：stemTopSVG → stemBottomSVG + gapSVG
  │            ├── D 临时放置 (MEASURE_X, MEASURE_Y) → 测量偏移 → 对齐
  │            └── 绑定点击事件
```

### 点击交互流程

```
点击 p (.char-trigger)
  │
  ├── 防重入检查 (isAnimating)
  ├── p 变绿色 (class="active")
  ├── .extension-stem stroke-dashoffset 0→全长，自上而下画出 (ANIM_DELAY ms)
  │
  └── setTimeout ANIM_DELAY ms
        ├── D (.char-target) 添加 .show → opacity 1
        └── 其余 .char-anim 添加 .show → 按 --i 延迟错开
```

### 窗口缩放

```
window resize
  └── 如果 p 处于 active 状态 → 重新 applyStemData() → 设置 strokeDashoffset=0
```

## 关键技术点

| 技术 | 位置 | 说明 |
|------|------|------|
| **opentype.js** | [index.html:8](index.html#L8) | CDN 加载，解析 .ttf glyph 路径 |
| **竖线提取** | [script.js:22-58](script.js#L22) `getStemFromPath()` | 识别纵向线段 → 按 x 聚合 → 取最左组 |
| **字体单位 → SVG 像素** | [script.js:80-91](script.js#L80) | `scale = fontSize / unitsPerEm`；所有坐标统一用 SVG 像素 |
| **延伸路径** | [script.js:100-125](script.js#L100) | 竖线中心 stoke 直线，stroke-width = 矩形宽度 |
| **生长动画** | [style.css:98-101](style.css#L98) | stroke-dasharray/dashoffset，CSS transition |
| **D 对齐** | [script.js:141-157](script.js#L141) | D/P 同公式算 stemLeftSVG/stemBottomSVG，左沿+底部对齐 |
| **调试标记** | [script.js:127-139](script.js#L127) | 红点=顶部，橙点=底部（已注释） |
| **逐字动画** | [style.css:82-93](style.css#L82) | `transition-delay: calc(var(--i) * 0.06s)` |

## 公共调参区

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `GAP` | `2500` | 延伸距离（字体单位） |
| `WIDTH_MULTIPLIER` | `1.35` | 延伸宽度倍率 |
| `MEASURE_X` | `500` | D 临时测量 X（仅用于测偏移） |
| `MEASURE_Y` | `600` | D 临时测量 Y |
| `ANIM_DELAY` | `500` | 延伸动画时长 (ms) |

## 外部依赖

- [opentype.js 1.3.4](https://cdn.jsdelivr.net/npm/opentype.js@1.3.4/dist/opentype.min.js) — CDN 加载，用于字体 glyph 解析
