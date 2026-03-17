const db = require('../config/database');

const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 dakikada bir

/**
 * Suresi dolmus kayitlari temizle
 */
async function runCleanup() {
  try {
    // Eski used_tokens temizle (2 dakikadan eski)
    await db.query("DELETE FROM used_tokens WHERE used_at < NOW() - INTERVAL '2 minutes'");

    // Suresi dolmus pending_scans temizle
    await db.query('DELETE FROM pending_scans WHERE expires_at < NOW() AND completed = FALSE');

    // Suresi dolmus password_resets temizle
    await db.query('DELETE FROM password_resets WHERE expires_at < NOW()');

    // Suresi dolmus sessions temizle
    await db.query('DELETE FROM sessions WHERE expires_at < NOW()');
  } catch (err) {
    console.error('Cleanup hatasi:', err.message);
  }
}

function start() {
  // Ilk calisma 1 dakika sonra
  setTimeout(runCleanup, 60 * 1000);
  // Sonra her 5 dakikada bir
  setInterval(runCleanup, CLEANUP_INTERVAL);
  console.log('Cleanup servisi baslatildi (her 5 dakika)');
}

module.exports = { start, runCleanup };
