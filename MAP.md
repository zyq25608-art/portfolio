# MAP — Portfolio Interaction

## 项目概览

单页交互式 Portfolio 网站。草地照片背景上覆盖磨砂玻璃砖网格（30×20），点击 SVG 中 "portfolio" 的触发字母（p / r / f / l），竖线延伸生长，各自对应一个目标单词逐字显现。支持展开/收起切换。

## 配置总览

| 触发 | 方向 | GAP | 目标单词 | 锚点 |
|------|------|-----|----------|------|
| p | ↓ 下 | 5500 | Digital Products | D |
| r | ↓ 下 | 4000 | Design & Visual Identity | D |
| f | ↓ 下 | 2500 | Illustration | I |
| l | ↑ 上 | 2500 | About Me | A |

## 文件结构

```
Portfolio_web/
├── index.html              # SVG 布局 + 背景层 div
├── script.js               # 配置驱动：LETTER_CONFIGS → setupLetter() → 动画
├── background-set.js        # 玻璃砖网格：initGrid + updateTiles（独立模块）
├── style.css               # 全部样式
├── assets/
│   └── background-fig.jpg   # 草地背景照片
├── fonts/
│   └── PixelifySans-Regular.ttf
├── .prettierrc / .prettierignore
├── .vscode/settings.json
└── .gitignore
```

## 层级架构

```
z-index 0: .bg-base           — 草地背景
z-index 1: .grid-overlay      — 模糊瓷砖（30×20 CSS Grid）
z-index 2: .grid-lines        — 透明网格线（pointer-events: none）
z-index 3: .canvas (SVG)      — Portfolio 交互
z-index 4: .hint              — 提示文字
```

## 架构与数据流

### 字母延伸

```
初始化：
  收集所有独有字形 (p/r/f/l/D/I/A) → 并行加载
    → getStemFromPath(commands, char) 提取竖线
        ├── 通用：按 x 分组，最左组 = 竖线左沿
        └── I 特殊：取单条最长边所属 x 组（排除 serif 外轮廓）
    → 每个 LETTER_CONFIG 调用 setupLetter(config, triggerGlyph, anchorGlyph)

点击交互（toggle）：
  ├── 展开：延伸线动画 → 字母左→右逐字显现
  ├── 收起：字母右→左逐字消失 → 线条收回
  └── trigger 永久保持 accent 色

Resize：
  └── updateGeometry() 只更新坐标，不重新绑定事件
```

### 玻璃砖背景

```
initGrid() — DOMContentLoaded
  ├── 加载图片获取原始尺寸
  ├── cover 缩放计算（底部对齐，不压扁）
  ├── 创建 600 个 .tile（各自独立 background-position）
  └── 创建 600 个 .grid-cell（透明网格线）

.tile::after — backdrop-filter: blur() + 半透明玻璃层
hover → blur(0)，移出 2s 缓慢恢复

updateTiles() — resize
  └── 只更新现有 tile 的 backgroundSize/Position，不重建 DOM
```

## 关键技术点

| 技术 | 说明 |
|------|------|
| **opentype.js** | CDN 加载，glyph 路径解析 |
| **竖线提取** | `getStemFromPath()` 纵向边检测 → x 分组 |
| **生长动画** | stroke-dasharray/dashoffset CSS transition |
| **toggle 收起** | 反向 transition-delay + 线条收回 |
| **配置驱动** | `LETTER_CONFIGS[]` 新增字母只需加一条 |
| **玻璃砖** | `backdrop-filter: blur()` 在 `::after` 伪元素上（避免 Chrome filter+background-size bug） |
| **cover 自适应** | JS 计算 cover 渲染尺寸 + 底部对齐 + 逐块 offset |

## 外部依赖

- [opentype.js 1.3.4](https://cdn.jsdelivr.net/npm/opentype.js@1.3.4/dist/opentype.min.js) — 字体 glyph 解析
