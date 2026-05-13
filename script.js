document.addEventListener('DOMContentLoaded', () => {
    const triggerChar = document.querySelector('.char-trigger');
    const targetChar = document.querySelector('.char-target');
    const targetSection = document.querySelector('.section-title');
    const canvas = document.querySelector('.canvas');

    let isAnimating = false;
    let _pData = null;
    let _dData = null;

    // ==================== 公共调参区 ====================
    const GAP = 2500; // 延伸距离（字体单位，Pixelify Sans 的 unitsPerEm=1000）
    const WIDTH_MULTIPLIER = 1.35; // 延伸宽度倍率
    const MEASURE_X = 500; // D 的临时测量 X 坐标（仅用于测偏移，不影响最终定位）
    const MEASURE_Y = 600; // D 的临时测量 Y 坐标
    const ANIM_DELAY = 500; // 延伸动画时长 (ms)

    /**
     * 从路径命令中提取竖线矩形 — 像素字体极简版
     * 取最小两个 x 值作为竖线左右沿，取所有 y 的最值作为上下沿
     */
    function getStemFromPath(commands) {
        const pts = commands.filter((c) => c.x !== undefined);

        // 提取所有垂直边（dx 小、dy 大的线段）
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

        // 按 x 聚合，取最左侧一组作为竖线
        const sortedX = [...new Set(verticalEdges.map((e) => e.x))].sort(
            (a, b) => a - b
        );
        const stemX = sortedX[0];
        const stemEdges = verticalEdges.filter(
            (e) => Math.abs(e.x - stemX) < 3
        );
        const ys = stemEdges.flatMap((e) => [e.y1, e.y2]);

        // 竖线宽度 = 下一个不同 x 值 − 最左侧 x
        const stemWidth = sortedX.length > 1 ? sortedX[1] - sortedX[0] : 0;

        return {
            left: stemX,
            right: stemX + stemWidth,
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
                stem: getStemFromPath(path.commands),
                unitsPerEm: font.unitsPerEm,
            });
        });
    }

    function applyStemData(pData, dData) {
        const portfolio = document.querySelector('.portfolio');
        const baselineY = parseFloat(portfolio.getAttribute('y'));
        const fontSize = parseFloat(
            window.getComputedStyle(portfolio).fontSize
        );
        const scale = fontSize / pData.unitsPerEm;

        const pStem = pData.stem;
        const pBBox = triggerChar.getBBox();

        // ---------- SVG 像素坐标 ----------
        const stemLeftSVG = pBBox.x + pStem.left * scale;
        const stemRightSVG = pBBox.x + pStem.right * scale;
        const stemTopSVG = baselineY + pStem.top * scale;
        const stemBottomSVG = baselineY + pStem.bottom * scale;

        const stemCenterX = (stemLeftSVG + stemRightSVG) / 2;
        const stemHalfWidth =
            ((stemRightSVG - stemLeftSVG) / 2) * WIDTH_MULTIPLIER;
        const extLeft = stemCenterX - stemHalfWidth;
        const extRight = stemCenterX + stemHalfWidth;
        const gapSVG = GAP * scale;

        // ========== 1. 延伸路径 ==========
        let extPath = document.querySelector('.extension-stem');
        if (!extPath) {
            extPath = document.createElementNS(
                'http://www.w3.org/2000/svg',
                'path'
            );
            extPath.setAttribute('class', 'extension-stem');
            extPath.setAttribute('fill', 'none');
            extPath.setAttribute('stroke', 'var(--accent)');
            extPath.setAttribute('stroke-linecap', 'butt');
            canvas.appendChild(extPath);
        }

        const extCenterX = (extLeft + extRight) / 2;
        const extTopY = stemTopSVG;
        const extBottomY_total = stemBottomSVG + gapSVG;
        const totalLength = extBottomY_total - extTopY;

        // 垂直中心线，stroke-width = 矩形宽度，视觉与填充矩形一致
        const d = `M ${extCenterX} ${extTopY} L ${extCenterX} ${extBottomY_total}`;
        extPath.setAttribute('d', d);
        extPath.setAttribute('stroke-width', extRight - extLeft);
        extPath.style.strokeDasharray = totalLength;
        extPath.style.strokeDashoffset = totalLength;
        extPath.removeAttribute('transform');

        // // ---------- 调试标记 ----------
        // let debugGroup = document.querySelector('.stem-debug');
        // if (!debugGroup) {
        //     debugGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        //     debugGroup.setAttribute('class', 'stem-debug');
        //     canvas.appendChild(debugGroup);
        // }
        // debugGroup.innerHTML = [
        //     `<circle cx="${stemLeftSVG}" cy="${stemTopSVG}" r="4" fill="red"/>`,
        //     `<circle cx="${stemRightSVG}" cy="${stemTopSVG}" r="4" fill="red"/>`,
        //     `<circle cx="${stemLeftSVG}" cy="${stemBottomSVG}" r="4" fill="orange"/>`,
        //     `<circle cx="${stemRightSVG}" cy="${stemBottomSVG}" r="4" fill="orange"/>`,
        // ].join('');

        // ========== 2. 对齐 D 文本：D 竖线左沿 ↔ P 竖线左沿 =========
        const extBottomY = stemBottomSVG + gapSVG;

        const dStem = dData.stem;

        // D 临时放置到测量位置，用和 P 相同的公式算 stemLeftSVG / stemBottomSVG
        targetSection.setAttribute('x', MEASURE_X);
        targetSection.setAttribute('y', MEASURE_Y);
        const dBBox = targetChar.getBBox();
        const dStemLeftSVG = dBBox.x + dStem.left * scale;
        const dStemBottomSVG = MEASURE_Y + dStem.bottom * scale;

        const dx = stemLeftSVG - dStemLeftSVG;
        const dy = extBottomY - dStemBottomSVG;

        targetSection.setAttribute('x', MEASURE_X + dx);
        targetSection.setAttribute('y', MEASURE_Y + dy);

        triggerChar.addEventListener('click', handleTriggerClick);
    }

    function handleTriggerClick() {
        if (isAnimating) return;
        isAnimating = true;

        triggerChar.classList.add('active');

        const extPath = document.querySelector('.extension-stem');
        if (extPath) {
            extPath.style.strokeDashoffset = '0';
        }

        // 延伸路径画完后，依次显现字母（包括 D）
        setTimeout(() => {
            targetChar.classList.add('show');
            document
                .querySelectorAll('.char-anim')
                .forEach((letter) => letter.classList.add('show'));
            isAnimating = false;
        }, ANIM_DELAY);
    }

    function handleResize() {
        if (!triggerChar.classList.contains('active')) return;
        applyStemData(_pData, _dData);
        const extPath = document.querySelector('.extension-stem');
        if (extPath) {
            extPath.style.strokeDashoffset = '0';
        }
    }

    window.addEventListener('resize', handleResize);

    // ========== 初始化 ==========
    Promise.all([
        new Promise((resolve) => loadGlyphStem('p', resolve)),
        new Promise((resolve) => loadGlyphStem('D', resolve)),
    ]).then(([pData, dData]) => {
        if (!pData || !dData) {
            console.error('无法加载字形数据');
            return;
        }
        _pData = pData;
        _dData = dData;
        document.fonts.ready.then(() => {
            requestAnimationFrame(() => applyStemData(pData, dData));
        });
    });
});
