/**
 * Utility Functions
 */
const Utils = {
  $(selector) {
    return document.querySelector(selector);
  },

  $$(selector) {
    return document.querySelectorAll(selector);
  },

  formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },

  formatPoints(points) {
    return `${points >= 0 ? '+' : ''}${points}`;
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  roleLabel(role) {
    const labels = {
      admin: 'Admin',
      mentor: 'Mentor',
      startup: 'Startup',
      participant: I18n.t('roles.participant'),
      gorevli: I18n.t('roles.gorevli'),
    };
    return labels[role] || role;
  },

  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },
};
