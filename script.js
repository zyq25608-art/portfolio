document.addEventListener('DOMContentLoaded', () => {
    // ========== 元素引用 ==========
    const triggerChar = document.querySelector('.char-trigger');
    const targetChar = document.querySelector('.char-target');
    const extensionLine = document.querySelector('.extension-line');
    const targetSection = document.querySelector('.section-title');

    let isAnimating = false;
    // 存储从字体文件中解析出的 p / I 的竖线数据
    let pStemData = null;
    let iStemData = null;

    /**
     * 从路径命令数组中提取竖直主干，包含位置和宽度
     */
    function extractVerticalStems(commands) {
        const stems = [];
        let prevCmd = null;

        for (const cmd of commands) {
            if (prevCmd && cmd.type === 'L') {
                const dx = Math.abs(cmd.x - prevCmd.x);
                const dy = Math.abs(cmd.y - prevCmd.y);
                if (dx < 3 && dy > 50) {
                    stems.push({
                        x: cmd.x,
                        y1: Math.min(prevCmd.y, cmd.y),
                        y2: Math.max(prevCmd.y, cmd.y),
                    });
                }
            }
            prevCmd = cmd;
        }

        if (stems.length < 2) {
            return stems.length === 1 ? [{ ...stems[0], width: null }] : [];
        }

        // 按 x 坐标分组
        stems.sort((a, b) => a.x - b.x);
        const groups = [];
        let currentGroup = [stems[0]];
        for (let i = 1; i < stems.length; i++) {
            if (Math.abs(stems[i].x - currentGroup[0].x) < 5) {
                currentGroup.push(stems[i]);
            } else {
                groups.push(currentGroup);
                currentGroup = [stems[i]];
            }
        }
        groups.push(currentGroup);

        const groupedStems = groups.map((group) => ({
            x: group.reduce((sum, s) => sum + s.x, 0) / group.length,
            y1: Math.min(...group.map((s) => s.y1)),
            y2: Math.max(...group.map((s) => s.y2)),
        }));

        if (groupedStems.length === 2) {
            const [left, right] = groupedStems;
            return [
                {
                    x: left.x,
                    y1: Math.min(left.y1, right.y1),
                    y2: Math.max(left.y2, right.y2),
                    width: right.x - left.x,
                },
            ];
        }

        const mainStem = groupedStems.reduce((a, b) =>
            Math.abs(a.y2 - a.y1) > Math.abs(b.y2 - b.y1) ? a : b
        );
        let widthEstimate = null;
        const sortedByX = [...groupedStems].sort((a, b) => a.x - b.x);
        const mainIndex = sortedByX.indexOf(mainStem);
        if (mainIndex < sortedByX.length - 1) {
            widthEstimate = sortedByX[mainIndex + 1].x - mainStem.x;
        }

        return [{ ...mainStem, width: widthEstimate }];
    }

    /**
     * 解析指定字符的竖线数据（依赖 opentype.js）
     */
    function loadCharStemData(char, callback) {
        opentype.load('fonts/PixelifySans-Regular.ttf', (err, font) => {
            if (err) {
                console.error(`字体加载失败 (${char}):`, err);
                callback(null);
                return;
            }
            const glyph = font.charToGlyph(char);
            const path = glyph.getPath(0, 0, font.unitsPerEm);
            const stems = extractVerticalStems(path.commands);
            if (stems.length === 0) {
                console.warn(`未识别到 ${char} 的竖线`);
                callback(null);
                return;
            }
            const mainStem = stems.reduce((a, b) =>
                Math.abs(a.y2 - a.y1) > Math.abs(b.y2 - b.y1) ? a : b
            );
            callback({
                fontUnits: {
                    x: mainStem.x,
                    y1: mainStem.y1,
                    y2: mainStem.y2,
                    width: mainStem.width,
                },
                unitsPerEm: font.unitsPerEm,
            });
        });
    }

    /**
     * 获取 SVG 中 portfolio 文字的实际渲染字号
     */
    function getFontSizeFromSVG() {
        const portfolio = document.querySelector('.portfolio');
        const style = window.getComputedStyle(portfolio);
        return parseFloat(style.fontSize) || 72;
    }

    /**
     * 绘制字母度量参考线（包含 p 和 I 的竖线中心线）
     */
    function drawDebugGuides(
        triggerChar,
        pStem,
        pUnitsPerEm,
        scale,
        baselineY,
        iCenterX,
        iStemTop,
        iStemBottom
    ) {
        const ns = 'http://www.w3.org/2000/svg';
        const parent = document.querySelector('.canvas');
        const old = document.getElementById('debug-guides');
        if (old) old.remove();

        const g = document.createElementNS(ns, 'g');
        g.setAttribute('id', 'debug-guides');

        const bbox = triggerChar.getBBox();

        // 1. 红色虚线：p 包围盒
        const bboxRect = document.createElementNS(ns, 'rect');
        bboxRect.setAttribute('x', bbox.x);
        bboxRect.setAttribute('y', bbox.y);
        bboxRect.setAttribute('width', bbox.width);
        bboxRect.setAttribute('height', bbox.height);
        bboxRect.setAttribute('fill', 'none');
        bboxRect.setAttribute('stroke', '#ff0000');
        bboxRect.setAttribute('stroke-width', 2);
        bboxRect.setAttribute('stroke-dasharray', '6 4');
        g.appendChild(bboxRect);

        // 2. 蓝色实线：基线
        const baselineLine = document.createElementNS(ns, 'line');
        baselineLine.setAttribute('x1', bbox.x - 30);
        baselineLine.setAttribute('x2', bbox.x + bbox.width + 30);
        baselineLine.setAttribute('y1', baselineY);
        baselineLine.setAttribute('y2', baselineY);
        baselineLine.setAttribute('stroke', '#4488ff');
        baselineLine.setAttribute('stroke-width', 2);
        g.appendChild(baselineLine);

        // 3. 绿色半透明框：em 高度
        const emHeight = pUnitsPerEm * scale;
        const emRect = document.createElementNS(ns, 'rect');
        emRect.setAttribute('x', bbox.x - 10);
        emRect.setAttribute('y', baselineY - emHeight);
        emRect.setAttribute('width', bbox.width + 20);
        emRect.setAttribute('height', emHeight);
        emRect.setAttribute('fill', 'none');
        emRect.setAttribute('stroke', '#00ff00');
        emRect.setAttribute('stroke-width', 1);
        emRect.setAttribute('opacity', '0.5');
        g.appendChild(emRect);

        // 4. p 竖线区域（半透明绿色矩形 + 黄色中心虚线）
        if (pStem) {
            const stemLeft = bbox.x + pStem.x * scale;
            const stemRight =
                stemLeft + (pStem.width ? pStem.width * scale : 5);
            const stemTop = baselineY + pStem.y1 * scale;
            const stemBottom = baselineY + pStem.y2 * scale;

            const stemRect = document.createElementNS(ns, 'rect');
            stemRect.setAttribute('x', stemLeft);
            stemRect.setAttribute('y', stemTop);
            stemRect.setAttribute('width', stemRight - stemLeft);
            stemRect.setAttribute('height', stemBottom - stemTop);
            stemRect.setAttribute('fill', '#00ff00');
            stemRect.setAttribute('opacity', '0.25');
            g.appendChild(stemRect);

            const pCenterX = (stemLeft + stemRight) / 2;
            const centerLine = document.createElementNS(ns, 'line');
            centerLine.setAttribute('x1', pCenterX);
            centerLine.setAttribute('x2', pCenterX);
            centerLine.setAttribute('y1', stemTop);
            centerLine.setAttribute('y2', stemBottom);
            centerLine.setAttribute('stroke', '#ffff00');
            centerLine.setAttribute('stroke-width', 2);
            centerLine.setAttribute('stroke-dasharray', '5 3');
            g.appendChild(centerLine);

            // p 竖线底部白色圆点
            const pDot = document.createElementNS(ns, 'circle');
            pDot.setAttribute('cx', pCenterX);
            pDot.setAttribute('cy', stemBottom);
            pDot.setAttribute('r', 4);
            pDot.setAttribute('fill', '#ffffff');
            pDot.setAttribute('stroke', '#ff0000');
            pDot.setAttribute('stroke-width', 2);
            g.appendChild(pDot);
        }

        // 5. I 竖线中心线（橙色虚线）及其顶部/底部
        if (
            iCenterX !== undefined &&
            iStemTop !== undefined &&
            iStemBottom !== undefined
        ) {
            const iLine = document.createElementNS(ns, 'line');
            iLine.setAttribute('x1', iCenterX);
            iLine.setAttribute('x2', iCenterX);
            iLine.setAttribute('y1', iStemTop);
            iLine.setAttribute('y2', iStemBottom);
            iLine.setAttribute('stroke', '#ff8800');
            iLine.setAttribute('stroke-width', 2);
            iLine.setAttribute('stroke-dasharray', '5 3');
            g.appendChild(iLine);

            const iDot = document.createElementNS(ns, 'circle');
            iDot.setAttribute('cx', iCenterX);
            iDot.setAttribute('cy', iStemTop);
            iDot.setAttribute('r', 3);
            iDot.setAttribute('fill', '#ff8800');
            g.appendChild(iDot);
        }

        // 6. 目标 I 包围盒顶部（青色横线）
        const targetBox = document.querySelector('.char-target').getBBox();
        const targetTopLine = document.createElementNS(ns, 'line');
        targetTopLine.setAttribute('x1', targetBox.x - 5);
        targetTopLine.setAttribute('x2', targetBox.x + targetBox.width + 5);
        targetTopLine.setAttribute('y1', targetBox.y);
        targetTopLine.setAttribute('y2', targetBox.y);
        targetTopLine.setAttribute('stroke', '#00ffff');
        targetTopLine.setAttribute('stroke-width', 2);
        g.appendChild(targetTopLine);

        // 新增：I 字母底部（品红色）
        const targetBottomY = targetBox.y + targetBox.height;
        const targetBottomLine = document.createElementNS(ns, 'line');
        targetBottomLine.setAttribute('x1', targetBox.x - 5);
        targetBottomLine.setAttribute('x2', targetBox.x + targetBox.width + 5);
        targetBottomLine.setAttribute('y1', targetBottomY);
        targetBottomLine.setAttribute('y2', targetBottomY);
        targetBottomLine.setAttribute('stroke', '#ff00ff');
        targetBottomLine.setAttribute('stroke-width', 2);
        g.appendChild(targetBottomLine);

        // 绘图：
        // parent.appendChild(g);
    }

    /**
     * 应用精确对齐：p 竖线中心 ↔ I 竖线中心，延伸线垂直
     */
    function applyStemData() {
        // ========== 微调起点 (可自由修改) ==========
        const OFFSET_X = 0.5; // 正值右移，负值左移
        const OFFSET_Y = -50; // 正值下移，负值上移（比如 -1 或 -2）
        if (!pStemData || !iStemData) return;

        const portfolioText = document.querySelector('.portfolio');
        const baselineY = parseFloat(portfolioText.getAttribute('y'));
        const svgFontSize = getFontSizeFromSVG();
        const scale = svgFontSize / pStemData.unitsPerEm;

        const pStem = pStemData.fontUnits;
        const iStem = iStemData.fontUnits;

        // ========== 1. 计算 p 的竖线中心与底部 ==========
        const pLocalX = pStem.x * scale;
        const pWidth = pStem.width ? pStem.width * scale : 3;
        const pBottomOffset = pStem.y2 * scale;

        const pBBox = triggerChar.getBBox();
        const pCenterX = pBBox.x + pLocalX + pWidth / 2;
        const pBottomY = baselineY + pBottomOffset;

        // ========== 2. 计算 I 竖线中心（像素字体直接用包围盒中心） ==========
        const iWidth =
            iStem.width && iStem.width > 0 ? iStem.width * scale : null;

        // ========== 3. 文本临时定位（用一个大一点的正 x 值） ==========
        const tempTextX = 500; // 任意正数，不要 0
        const tempTextY = 600;
        targetSection.setAttribute('x', tempTextX);
        targetSection.setAttribute('y', tempTextY);

        // 获取此时 I 的包围盒
        const iBBoxTemp = targetChar.getBBox();

        // 确定 I 竖线中心的绝对 X
        let iCenterAbs;
        if (iWidth) {
            // 有可靠宽度
            const iLocalX = iStem.x * scale;
            iCenterAbs = iBBoxTemp.x + iLocalX + iWidth / 2;
        } else {
            // 宽度无效，使用包围盒中心作为竖线中心
            iCenterAbs = iBBoxTemp.x + iBBoxTemp.width / 2;
        }

        // 计算 I 竖线中心相对于文本 x 属性的偏移
        const offsetX = iCenterAbs - tempTextX; // 这个值不会随文本 x 变化而变化

        // 目标：I 竖线中心位于 pCenterX，所以文本的最终 x = pCenterX - offsetX
        const newTextX = pCenterX - offsetX;
        targetSection.setAttribute('x', newTextX);

        // ========== 4. 垂直方向：让 I 的底部对齐到 p 底部向下 gap 的位置 ==========
        // 垂直方向
        const gap = 200; // 从 p 底部到 I 底部的距离
        const targetEndY = pBottomY + gap;

        // 重新获取 I 包围盒（x 已经设置好）
        const iBBoxFinal = targetChar.getBBox();
        const iBottomY = iBBoxFinal.y + iBBoxFinal.height;

        // 调整基线，使 I 底部对准 targetEndY
        const currentTextY = parseFloat(targetSection.getAttribute('y'));
        const deltaY = targetEndY - iBottomY;
        const newTextY = currentTextY + deltaY;
        targetSection.setAttribute('y', newTextY);

        // 再次确认移动后的 I 底部（可选，但有助于调试）
        const finalIBottom =
            targetChar.getBBox().y + targetChar.getBBox().height;
        console.log('底部对齐验证:', {
            targetEndY,
            iBottomY_before: iBottomY,
            deltaY,
            newTextY,
            finalIBottom,
            线条终点应与finalIBottom相等: finalIBottom === targetEndY,
        });

        // ========== 5. 设置延伸线（垂直） ==========
        const realY1 = pBottomY + OFFSET_Y; // 真实的起点 y
        const realY2 = targetEndY; // 终点 y

        extensionLine.setAttribute('x1', pCenterX + OFFSET_X);
        extensionLine.setAttribute('y1', realY1);
        extensionLine.setAttribute('x2', pCenterX);
        extensionLine.setAttribute('y2', realY2);

        // 使用真实长度
        const lineLength = Math.abs(realY2 - realY1);
        extensionLine.style.setProperty('--line-length', lineLength);
        extensionLine.style.strokeWidth = pWidth * 1.2;

        // ========== 6. 控制台验证 ==========
        const iCenterFinal = iCenterAbs; // 因为 x 移动后，I 中心绝对 X 就是 pCenterX，但我们可验证一下
        console.log('对齐验证:', {
            pCenterX,
            newTextX,
            offsetX,
            iCenterFinal_expected: pCenterX,
            iBottomY,
            targetEndY,
        });

        // ========== 7. 调试参考线（需要计算 I 竖线的顶部/底部绝对坐标） ==========
        // 注意：解析里的 y1,y2 是相对基线的，我们这里用最终的基线 newTextY 来算
        const iStemTopAbs = newTextY + iStem.y1 * scale;
        const iStemBottomAbs = newTextY + iStem.y2 * scale;
        drawDebugGuides(
            triggerChar,
            pStem,
            pStemData.unitsPerEm,
            scale,
            baselineY,
            pCenterX, // 对齐后 I 的中心应该在这
            iStemTopAbs,
            iStemBottomAbs
        );

        // 绑定点击事件
        triggerChar.addEventListener('click', handleTriggerClick);
    }

    function handleTriggerClick() {
        if (isAnimating) return;
        isAnimating = true;

        triggerChar.classList.add('active');
        extensionLine.classList.add('active');

        // 线条动画 700ms 结束后，依次显示字母
        setTimeout(() => {
            const letters = document.querySelectorAll('.char-anim');
            letters.forEach((letter) => letter.classList.add('show'));
            isAnimating = false;
        }, 700);
    }

    function handleResize() {
        if (triggerChar.classList.contains('active')) {
            applyStemData();
            extensionLine.classList.add('active');
        }
    }

    window.addEventListener('resize', handleResize);

    // 并行加载 p 和 I 的竖线数据，完成后初始化布局
    Promise.all([
        new Promise((resolve) => loadCharStemData('p', resolve)),
        new Promise((resolve) => loadCharStemData('I', resolve)),
    ]).then(([pData, iData]) => {
        pStemData = pData;
        iStemData = iData;

        // 确保浏览器已经把字体渲染到文字上
        document.fonts.ready.then(() => {
            // 再等一帧，保证所有重排完毕
            requestAnimationFrame(() => {
                applyStemData();
            });
        });
    });
});
