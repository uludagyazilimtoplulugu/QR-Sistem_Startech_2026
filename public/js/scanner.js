/**
 * QR Scanner (html5-qrcode)
 */
const Scanner = {
  html5QrCode: null,
  isScanning: false,
  lastScan: 0,
  COOLDOWN: 2000, // 2 saniye bekleme (duplicate onleme)

  async start(readerId, onScan) {
    if (this.isScanning) return;

    // Kutuphane yuklendi mi?
    if (typeof Html5Qrcode === 'undefined') {
      Toast.error('QR tarayıcı kütüphanesi yüklenemedi. Sayfayı yenileyin.');
      return;
    }

    const readerEl = document.getElementById(readerId);
    if (!readerEl) {
      console.error('Scanner element not found:', readerId);
      return;
    }

    try {
      this.html5QrCode = new Html5Qrcode(readerId);

      await this.html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          const now = Date.now();
          if (now - this.lastScan < this.COOLDOWN) return;
          this.lastScan = now;
          onScan(decodedText);
        },
        () => {} // ignore errors (no QR found in frame)
      );

      this.isScanning = true;
    } catch (err) {
      console.error('Kamera hatası:', err);
      const errStr = String(err);
      if (errStr.includes('NotAllowedError') || errStr.includes('Permission')) {
        Toast.error('Kamera izni reddedildi. Tarayıcı ayarlarından kamera iznini verin.');
      } else if (errStr.includes('NotFoundError') || errStr.includes('Requested device not found')) {
        Toast.error('Kamera bulunamadı. Cihazınızda kamera olduğundan emin olun.');
      } else {
        Toast.error('Kamera açılamadı. Başka bir uygulamanın kamerayı kullanmadığını kontrol edin.');
      }
    }
  },

  async stop() {
    if (this.html5QrCode && this.isScanning) {
      try {
        await this.html5QrCode.stop();
      } catch (e) { /* ignore */ }
      this.isScanning = false;
    }
  },

  destroy() {
    this.stop();
    this.html5QrCode = null;
  },
};
