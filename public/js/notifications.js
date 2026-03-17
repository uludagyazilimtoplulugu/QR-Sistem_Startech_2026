/**
 * Toast Notification System
 * Renkler: success (yesil), info/pending (mavi), warning (sari), error (kirmizi)
 */
const Toast = {
  show(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: '✓',
      info: 'ℹ',
      pending: '⏳',
      warning: '⚠',
      error: '✕',
    };

    toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`;

    // Tikla = kapat
    toast.addEventListener('click', () => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    });

    container.appendChild(toast);

    // Otomatik kapat
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  },

  success(msg) { this.show(msg, 'success'); },
  info(msg) { this.show(msg, 'info'); },
  pending(msg) { this.show(msg, 'pending', 8000); },
  warning(msg) { this.show(msg, 'warning'); },
  error(msg) { this.show(msg, 'error', 6000); },
};
