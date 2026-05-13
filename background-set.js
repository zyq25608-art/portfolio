let imgW = 0;
let imgH = 0;

function getRenderSizes(vpW, vpH) {
    const scale = Math.max(vpW / imgW, vpH / imgH);
    return {
        renderW: Math.round(imgW * scale),
        renderH: Math.round(imgH * scale),
        offsetX: Math.round((vpW - Math.round(imgW * scale)) / 2),
        offsetY: vpH - Math.round(imgH * scale),
    };
}

function updateTiles() {
    const tiles = document.querySelectorAll('.tile');
    const cells = document.querySelectorAll('.grid-cell');
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const cols = 30;
    const rows = 20;
    const tileW = vpW / cols;
    const tileH = vpH / rows;
    const { renderW, renderH, offsetX, offsetY } = getRenderSizes(vpW, vpH);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const i = r * cols + c;
            const tile = tiles[i];
            if (tile) {
                tile.style.backgroundSize = `${renderW}px ${renderH}px`;
                tile.style.backgroundPosition = `${Math.round(offsetX - c * tileW)}px ${Math.round(offsetY - r * tileH)}px`;
            }
            // grid-cells 无需更新
        }
    }
}

function initGrid() {
    const grid = document.getElementById('grid');
    const lines = document.getElementById('grid-lines');

    const img = new Image();
    img.src = 'assets/background-fig.jpg';
    img.onload = () => {
        imgW = img.naturalWidth;
        imgH = img.naturalHeight;

        const vpW = window.innerWidth;
        const vpH = window.innerHeight;
        const cols = 30;
        const rows = 20;
        const tileW = vpW / cols;
        const tileH = vpH / rows;
        const { renderW, renderH, offsetX, offsetY } = getRenderSizes(vpW, vpH);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.style.backgroundImage = "url('assets/background-fig.jpg')";
                tile.style.backgroundSize = `${renderW}px ${renderH}px`;
                tile.style.backgroundPosition = `${Math.round(offsetX - c * tileW)}px ${Math.round(offsetY - r * tileH)}px`;
                grid.appendChild(tile);

                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                lines.appendChild(cell);
            }
        }
    };
}

document.addEventListener('DOMContentLoaded', initGrid);
window.addEventListener('resize', () => {
    if (imgW > 0) updateTiles();
});
