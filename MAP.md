# MAP — Portfolio Interaction

## 项目概览

单页交互式 Portfolio 网站。点击 SVG 中 "portfolio" 的触发字母（p / r / f / l），竖线延伸生长，各自对应一个目标单词逐字显现。

## 配置总览

| 触发 | 方向 | GAP | 目标单词 | 锚点 |
|------|------|-----|----------|------|
| p | ↓ 下 | 5500 | Digital Products | D |
| r | ↓ 下 | 2500 | Design & Visual Identity | D |
| f | ↓ 下 | 1500 | Illustration | I |
| l | ↑ 上 | 2500 | About Me | A |

## 文件结构

```
Portfolio_web/
├── index.html          # SVG 布局，4 个触发字母 + 4 个目标区块
├── script.js           # 配置驱动：LETTER_CONFIGS → setupLetter() → 动画
├── style.css           # 样式，char-trigger/extension-stem/char-anim 通用
├── fonts/
│   └── PixelifySans-Regular.ttf
├── .prettierrc / .prettierignore
├── .vscode/settings.json
└── .gitignore
```

## 架构与数据流

```
初始化：
  收集所有独有字形 (p/r/f/l/D/I/A) → 并行加载
    → getStemFromPath(commands, char) 提取竖线
        │
        ├── 通用：按 x 分组，最左组 = 竖线左沿
        └── I 特殊：取单条最长边所属 x 组（排除 serif 外轮廓）
    → 每个 LETTER_CONFIG 调用 setupLetter(config, triggerGlyph, anchorGlyph)

setupLetter()：
  ├── 字体单位 → SVG 像素 (scale = fontSize / unitsPerEm)
  ├── 计算触发字母的 stemLeftSVG / stemRightSVG / stemTopSVG / stemBottomSVG
  ├── 根据 direction 创建延伸 <path>
  │     down: stemTopSVG → stemBottomSVG + gapSVG
  │     up:   stemBottomSVG → stemBottomSVG - gapSVG
  ├── 锚点字母临时放置 (MEASURE_X, MEASURE_Y) → 测量偏移 → 对齐
  │     down: 锚点底部对齐延伸终点
  │     up:   锚点顶部对齐延伸终点
  └── 绑定独立点击事件 → stroke-dashoffset 动画 → 逐字显现

点击交互：
  ├── 防重入锁 (per-letter isAnimating)
  ├── 触发字母变绿 (class="active")
  ├── extension-stem stroke-dashoffset 动画 (自上而下或自下而上)
  └── setTimeout → char-target + char-anim 逐字显现 (--i 延迟)

Resize：
  └── 遍历 LETTER_CONFIGS，对 active 状态的重算 + strokeDashoffset=0
```

## 关键技术点

| 技术 | 位置 | 说明 |
|------|------|------|
| **opentype.js** | CDN | glyph 路径解析 |
| **竖线提取** | `getStemFromPath()` | 纵向边检测 → x 分组 → I 特殊取最长边、其余取最左 |
| **坐标映射** | `setupLetter()` | 所有计算统一用 SVG 像素坐标 |
| **生长动画** | CSS `.extension-stem` | stroke-dasharray/dashoffset transition |
| **逐字动画** | CSS `.char-anim` | `transition-delay: calc(var(--i) * 0.06s)` |
| **配置驱动** | `LETTER_CONFIGS[]` | 新增字母只需加一条配置 |

## 公共调参区

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `WIDTH_MULTIPLIER` | `1.35` | 延伸宽度倍率 |
| `MEASURE_X` | `500` | 锚点字母临时测量 X |
| `MEASURE_Y` | `600` | 锚点字母临时测量 Y |
| `ANIM_DELAY` | `500` | 延伸动画时长 (ms) |
| 各字母 `gap` | 见配置表 | 延伸距离（字体单位） |

## 外部依赖

- [opentype.js 1.3.4](https://cdn.jsdelivr.net/npm/opentype.js@1.3.4/dist/opentype.min.js) — 字体 glyph 解析
