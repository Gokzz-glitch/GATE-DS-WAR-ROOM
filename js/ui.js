const UI = (function() {
    function showModal(title, contentHtml, actionsHtml = '') {
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) return;
        
        modalContainer.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="close-btn" onclick="UI.hideModal()">&times;</button>
                </div>
                <div class="modal-body">${contentHtml}</div>
                ${actionsHtml ? `<div class="modal-actions">${actionsHtml}</div>` : ''}
            </div>
        `;
        modalContainer.style.display = 'flex';
        setTimeout(() => modalContainer.classList.add('visible'), 10);
    }

    function hideModal() {
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) return;
        modalContainer.classList.remove('visible');
        setTimeout(() => {
            modalContainer.style.display = 'none';
            modalContainer.innerHTML = '';
        }, 200);
    }

    function showToast(message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = createElement('div', 'toast-container');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = createElement('div', `toast toast-${type}`);
        toast.innerHTML = `<span class="toast-message">${message}</span>`;
        
        container.appendChild(toast);
        
        setTimeout(() => toast.classList.add('visible'), 10);
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function animateProgressRing(element, percentage) {
        if (!element) return;
        // Using conic-gradient for the ring
        const fill = `conic-gradient(var(--accent) ${percentage}%, transparent 0)`;
        element.style.background = fill;
        
        const textEl = element.querySelector('.ring-text');
        if (textEl) textEl.textContent = `${Math.round(percentage)}%`;
    }

    function formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const d = new Date(timestamp);
        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    }

    function parseDate(str) {
        if (!str) return null;
        const parts = str.split('-');
        if (parts.length !== 3) return null;
        return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
    }

    function daysUntil(timestamp) {
        if (!timestamp) return 0;
        const now = new Date().setHours(0,0,0,0);
        const target = new Date(timestamp).setHours(0,0,0,0);
        return Math.round((target - now) / (1000 * 60 * 60 * 24));
    }

    function debounce(fn, ms) {
        let timer;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), ms);
        };
    }

    function createElement(tag, className, innerHTML = '') {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (innerHTML) el.innerHTML = innerHTML;
        return el;
    }

    return {
        showModal,
        hideModal,
        showToast,
        animateProgressRing,
        formatDate,
        parseDate,
        daysUntil,
        debounce,
        createElement
    };
})();
