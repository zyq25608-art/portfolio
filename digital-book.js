// ==================== 书本状态 ====================
const bookState = {
    isOpen: false,
    section: null,
    pageIndex: 0,
    isAnimating: false,
};

// ==================== 内容数据 ====================
const bookContent = {
    'digital-products': [
        {
            left: { title: '01 My Room', sub: '培育一个数字空间', date: '2026.03', video: 'assets/MyRoom/MyRoom.mp4', poster: 'assets/MyRoom/MyRoom-封面.jpg' },
            right: { title: '02 AI Chat', sub: '培育一段数字关系', color: '#EE1256', date: '2026.05', video: 'assets/AI Chat/AI Chat.mp4', poster: 'assets/AI Chat/AI Chat-封面.jpg' },
        },
    ],
};

// ==================== 渲染 ====================
function renderPageContent(pageData) {
    const video = pageData.video
        ? `<div class="page-video">
            <video src="${pageData.video}" poster="${pageData.poster}" preload="metadata" controls></video>
        </div>`
        : '';
    const dateTag = pageData.date ? `<div class="page-date">${pageData.date}</div>` : '';
    const colorStyle = pageData.color ? ` style="color:${pageData.color}"` : '';
    return `<div class="page-inner">
        <h2${colorStyle}>${pageData.title}</h2>
        ${pageData.sub ? `<p class="page-sub">${pageData.sub}</p>` : ''}
        ${video}
        ${dateTag}
    </div>`;
}

function renderCurrentPage() {
    const pages = bookContent[bookState.section];
    if (!pages || !pages[bookState.pageIndex]) return;
    const pageData = pages[bookState.pageIndex];

    const leftEl = document.getElementById('page-left-content');
    const rightEl = document.getElementById('page-right-content');
    leftEl.innerHTML = renderPageContent(pageData.left);
    rightEl.innerHTML = renderPageContent(pageData.right);

    [leftEl, rightEl].forEach((el) => {
        el.onclick = () => {
            if (el.classList.contains('to-top')) return;
            el.classList.add('to-top');
            setTimeout(() => {
                el.classList.add('video-show');
                el.parentElement.classList.add('to-top');
            }, 600);
        };
    });
}

// ==================== 打开 / 关闭 ====================
function openBook(section) {
    bookState.isOpen = true;
    bookState.section = section;
    bookState.pageIndex = 0;
    document.getElementById('book-layer').classList.remove('hidden');
    renderCurrentPage();
}

function closeBook() {
    bookState.isOpen = false;
    bookState.section = null;
    bookState.pageIndex = 0;
    // 重置状态
    document.querySelectorAll('.page-content').forEach((el) => {
        el.classList.remove('to-top', 'video-show');
        el.parentElement.classList.remove('to-top');
    });
    document.getElementById('book-layer').classList.add('hidden');
}

// ==================== 点击书本外关闭 ====================
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('book-layer').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeBook();
    });
});

