/**
 * QR Code Generation & Display
 */
const QR = {
  refreshTimer: null,
  countdownTimer: null,
  secondsLeft: 60,

  async generate(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const data = await API.get('/qr/generate');
    if (data.error || !data.qrContent) {
      container.innerHTML = `<p class="text-danger">${data.message || 'QR oluşturulamadı'}</p>`;
      return;
    }

    this.secondsLeft = data.secondsLeft;

    container.innerHTML = `
      <div class="qr-container">
        <div class="qr-code-wrapper">
          <canvas id="qr-canvas"></canvas>
        </div>
        <div class="short-code">${data.shortCode}</div>
        <div class="qr-timer">
          <span data-i18n="qr.refreshing">Yenilenme</span>:
          <span class="seconds green" id="qr-seconds">${this.secondsLeft}</span>
          <span>sn</span>
        </div>
      </div>
    `;

    // QR Code olustur
    const canvas = document.getElementById('qr-canvas');
    if (canvas && typeof QRCode !== 'undefined') {
      QRCode.toCanvas(canvas, data.qrContent, {
        width: 220,
        margin: 2,
        color: { dark: '#111a24', light: '#ffffff' },
      });
    } else if (canvas) {
      const wrapper = container.querySelector('.qr-code-wrapper');
      if (wrapper) wrapper.innerHTML = '<p class="text-danger" style="padding:20px">QR kütüphane yüklenemedi. Sayfayı yenileyin.</p>';
    }

    this.startCountdown();
    this.startAutoRefresh(containerId);
  },

  startCountdown() {
    this.stopCountdown();
    this.countdownTimer = setInterval(() => {
      this.secondsLeft--;
      const el = document.getElementById('qr-seconds');
      if (el) {
        el.textContent = Math.max(0, this.secondsLeft);
        el.className = 'seconds ' + (this.secondsLeft > 30 ? 'green' : this.secondsLeft > 10 ? 'yellow' : 'red');
      }
      // Sure dolduysa hemen yenile
      if (this.secondsLeft <= 0) {
        this.stopCountdown();
        // containerId'yi bul ve yenile
        const container = document.querySelector('.qr-container');
        if (container && container.parentElement) {
          this.stopAutoRefresh();
          this.generate(container.parentElement.id);
        }
      }
    }, 1000);
  },

  startAutoRefresh(containerId) {
    this.stopAutoRefresh();
    // Kalan sureye gore yenile (2 sn erken, senkron kalmasi icin)
    const refreshMs = Math.max((this.secondsLeft - 2) * 1000, 3000);
    this.refreshTimer = setTimeout(() => {
      this.generate(containerId);
    }, refreshMs);
  },

  stopCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  },

  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  },

  destroy() {
    this.stopCountdown();
    this.stopAutoRefresh();
  },
};
