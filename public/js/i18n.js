/**
 * i18n - Turkce / Ingilizce Dil Yonetimi
 */
const I18n = {
  currentLang: 'tr',
  translations: {},

  async init() {
    this.currentLang = localStorage.getItem('lang') || 'tr';

    // Ceviri dosyalarini yukle
    try {
      const [trRes, enRes] = await Promise.all([
        fetch('/locales/tr.json').then(r => r.json()),
        fetch('/locales/en.json').then(r => r.json()),
      ]);
      this.translations = { tr: trRes, en: enRes };
    } catch (e) {
      console.warn('Ceviri dosyalari yuklenemedi, varsayilan kullaniliyor');
      this.translations = { tr: {}, en: {} };
    }

    this.updatePage();
    this.updateLangButton();
  },

  t(key) {
    const keys = key.split('.');
    let value = this.translations[this.currentLang];
    for (const k of keys) {
      if (!value) return key;
      value = value[k];
    }
    return value || key;
  },

  toggle() {
    this.currentLang = this.currentLang === 'tr' ? 'en' : 'tr';
    localStorage.setItem('lang', this.currentLang);
    this.updatePage();
    this.updateLangButton();
  },

  updatePage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = this.t(key);
      if (text !== key) {
        el.textContent = text;
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const text = this.t(key);
      if (text !== key) {
        el.placeholder = text;
      }
    });
  },

  updateLangButton() {
    const btn = document.getElementById('btn-lang');
    if (btn) btn.textContent = this.currentLang.toUpperCase();
  },
};
