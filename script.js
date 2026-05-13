document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.querySelector('.canvas');
    const portfolio = document.querySelector('.portfolio');

    // ==================== 字母配置 ====================
    const LETTER_CONFIGS = [
        {
            id: 'p',
            triggerSelector: '.char-trigger-p',
            targetSection: '.section-p',
            gap: 5500,
            triggerChar: 'p',
            anchorChar: 'D',
        },
        {
            id: 'r',
            triggerSelector: '.char-trigger-r',
            targetSection: '.section-r',
            gap: 2500,
            triggerChar: 'r',
            anchorChar: 'D',
        },
        {
            id: 'f',
            triggerSelector: '.char-trigger-f',
            targetSection: '.section-f',
            gap: 1500,
            triggerChar: 'f',
            anchorChar: 'I',
        },
    ];

    // ==================== 公共调参区 ====================
    const WIDTH_MULTIPLIER = 1.35; // 延伸宽度倍率
    const MEASURE_X = 500; // 锚点字母临时测量 X 坐标
    const MEASURE_Y = 600; // 锚点字母临时测量 Y 坐标
    const ANIM_DELAY = 500; // 延伸动画时长 (ms)

    // ==================== 每个字母的运行状态 ====================
    const letterStates = {};

    /**
     * 从路径命令中提取竖线矩形 — 像素字体用
     */
    function getStemFromPath(commands, char) {
        const pts = commands.filter((c) => c.x !== undefined);

        const verticalEdges = [];
        for (let i = 1; i < pts.length; i++) {
            const dx = Math.abs(pts[i].x - pts[i - 1].x);
            const dy = Math.abs(pts[i].y - pts[i - 1].y);
            if (dx < 3 && dy > 10) {
                verticalEdges.push({
                    x: pts[i].x,
                    y1: Math.min(pts[i].y, pts[i - 1].y),
                    y2: Math.max(pts[i].y, pts[i - 1].y),
                });
            }
        }

        const sortedX = [...new Set(verticalEdges.map((e) => e.x))].sort(
            (a, b) => a - b
        );

        let stemLeft;
        if (char === 'I') {
            // I 有 serif：排除全长外轮廓组后，取最左的组作为竖线左沿
            const groups = sortedX.map((x) => {
                const edges = verticalEdges.filter(
                    (e) => Math.abs(e.x - x) < 3
                );
                const maxEdgeLen = Math.max(
                    ...edges.map((e) => e.y2 - e.y1)
                );
                return { x, maxEdgeLen };
            });
            const maxLen = Math.max(...groups.map((g) => g.maxEdgeLen));
            const stemGroups = groups.filter((g) => g.maxEdgeLen === maxLen);
            stemLeft = stemGroups[0].x;
        } else {
            // 其他字母：最左侧 x 组即竖线
            stemLeft = sortedX[0];
        }

        const stemEdges = verticalEdges.filter(
            (e) => Math.abs(e.x - stemLeft) < 3
        );
        const ys = stemEdges.flatMap((e) => [e.y1, e.y2]);

        const stemIndex = sortedX.indexOf(stemLeft);
        const stemRight =
            sortedX[stemIndex + 1] ||
            stemLeft + (sortedX[1] - sortedX[0]);

        return {
            left: stemLeft,
            right: stemRight,
            top: Math.min(...ys),
            bottom: Math.max(...ys),
        };
    }

    function loadGlyphStem(char, callback) {
        opentype.load('fonts/PixelifySans-Regular.ttf', (err, font) => {
            if (err) {
                console.error(`字体加载失败 (${char}):`, err);
                callback(null);
                return;
            }
            const glyph = font.charToGlyph(char);
            const path = glyph.getPath(0, 0, font.unitsPerEm);
            callback({
                stem: getStemFromPath(path.commands, char),
                unitsPerEm: font.unitsPerEm,
            });
        });
    }

    // ==================== 单字母初始化 ====================
    function setupLetter(config, triggerGlyph, anchorGlyph) {
        const triggerEl = document.querySelector(config.triggerSelector);
        const targetSection = document.querySelector(config.targetSection);
        const targetChar = targetSection.querySelector('.char-target');
        const animLetters = targetSection.querySelectorAll('.char-anim');

        if (!triggerEl || !targetSection || !targetChar) {
            console.error(`配置 "${config.id}" 缺少 DOM 元素`);
            return;
        }

        const baselineY = parseFloat(portfolio.getAttribute('y'));
        const fontSize = parseFloat(
            window.getComputedStyle(portfolio).fontSize
        );
        const scale = fontSize / triggerGlyph.unitsPerEm;

        const stem = triggerGlyph.stem;
        const tBBox = triggerEl.getBBox();

        // ---------- 触发字母竖线 SVG 坐标 ----------
        const stemLeftSVG = tBBox.x + stem.left * scale;
        const stemRightSVG = tBBox.x + stem.right * scale;
        const stemTopSVG = baselineY + stem.top * scale;
        const stemBottomSVG = baselineY + stem.bottom * scale;

        const stemCenterX = (stemLeftSVG + stemRightSVG) / 2;
        const stemHalfWidth =
            ((stemRightSVG - stemLeftSVG) / 2) * WIDTH_MULTIPLIER;
        const extLeft = stemCenterX - stemHalfWidth;
        const extRight = stemCenterX + stemHalfWidth;
        const gapSVG = config.gap * scale;

        // ---------- 延伸路径 ----------
        let extPath = document.querySelector(`.extension-${config.id}`);
        if (!extPath) {
            extPath = document.createElementNS(
                'http://www.w3.org/2000/svg',
                'path'
            );
            extPath.setAttribute(
                'class',
                `extension-stem extension-${config.id}`
            );
            extPath.setAttribute('fill', 'none');
            extPath.setAttribute('stroke', 'var(--accent)');
            extPath.setAttribute('stroke-linecap', 'butt');
            canvas.appendChild(extPath);
        }

        const extCenterX = (extLeft + extRight) / 2;
        const extTopY = stemTopSVG;
        const extBottomY_total = stemBottomSVG + gapSVG;
        const totalLength = extBottomY_total - extTopY;

        const d = `M ${extCenterX} ${extTopY} L ${extCenterX} ${extBottomY_total}`;
        extPath.setAttribute('d', d);
        extPath.setAttribute('stroke-width', extRight - extLeft);
        extPath.style.strokeDasharray = totalLength;
        extPath.style.strokeDashoffset = totalLength;
        extPath.removeAttribute('transform');

        // ---------- 锚点字母对齐 ----------
        const extBottomY = stemBottomSVG + gapSVG;
        const aStem = anchorGlyph.stem;

        targetSection.setAttribute('x', MEASURE_X);
        targetSection.setAttribute('y', MEASURE_Y);
        const aBBox = targetChar.getBBox();
        const aStemLeftSVG = aBBox.x + aStem.left * scale;
        const aStemRightSVG = aBBox.x + aStem.right * scale;
        const aStemTopSVG = MEASURE_Y + aStem.top * scale;
        const aStemBottomSVG = MEASURE_Y + aStem.bottom * scale;

        const dx = stemLeftSVG - aStemLeftSVG;
        const dy = extBottomY - aStemBottomSVG;

        targetSection.setAttribute('x', MEASURE_X + dx);
        targetSection.setAttribute('y', MEASURE_Y + dy);

        // ---------- 点击事件 ----------
        let isAnimating = false;

        function handleClick() {
            if (isAnimating) return;
            isAnimating = true;

            triggerEl.classList.add('active');
            extPath.style.strokeDashoffset = '0';

            setTimeout(() => {
                targetChar.classList.add('show');
                animLetters.forEach((l) => l.classList.add('show'));
                isAnimating = false;
            }, ANIM_DELAY);
        }

        triggerEl.addEventListener('click', handleClick);

        // ---------- 保存状态 ----------
        letterStates[config.id] = {
            triggerEl,
            targetSection,
            targetChar,
            animLetters,
            extPath,
            triggerGlyph,
            anchorGlyph,
        };
    }

    // ==================== Resize ====================
    function handleResize() {
        LETTER_CONFIGS.forEach((config) => {
            const state = letterStates[config.id];
            if (!state || !state.triggerEl.classList.contains('active')) return;

            setupLetter(config, state.triggerGlyph, state.anchorGlyph);

            const extPath = document.querySelector(`.extension-${config.id}`);
            if (extPath) {
                extPath.style.strokeDashoffset = '0';
            }
        });
    }

    window.addEventListener('resize', handleResize);

    // ==================== 初始化 ====================
    const uniqueChars = [
        ...new Set(
            LETTER_CONFIGS.flatMap((c) => [c.triggerChar, c.anchorChar])
        ),
    ];

    const glyphPromises = uniqueChars.map(
        (char) => new Promise((resolve) => loadGlyphStem(char, resolve))
    );

    Promise.all(glyphPromises).then((glyphDatas) => {
        if (glyphDatas.some((d) => !d)) {
            console.error('字形加载失败');
            return;
        }
        const glyphMap = Object.fromEntries(
            uniqueChars.map((char, i) => [char, glyphDatas[i]])
        );

        document.fonts.ready.then(() => {
            requestAnimationFrame(() => {
                LETTER_CONFIGS.forEach((config) => {
                    setupLetter(
                        config,
                        glyphMap[config.triggerChar],
                        glyphMap[config.anchorChar]
                    );
                });
            });
        });
    });
});
