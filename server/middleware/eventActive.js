const db = require('../config/database');

let cachedStatus = null;
let cacheTime = 0;
const CACHE_TTL = 10000; // 10 saniye cache

/**
 * Middleware: Etkinlik aktif değilse işlemleri engeller
 * Admin route'larina uygulanmaz
 */
async function eventActive(req, res, next) {
  try {
    const now = Date.now();

    // Use cache if fresh
    if (cachedStatus !== null && (now - cacheTime) < CACHE_TTL) {
      if (!cachedStatus) {
        return res.status(403).json({
          error: 'event_not_active',
          message: 'Etkinlik henüz başlamadı',
        });
      }
      return next();
    }

    // Query database
    const { rows } = await db.query('SELECT is_active FROM event_settings WHERE id = 1');
    cachedStatus = rows.length > 0 ? rows[0].is_active : false;
    cacheTime = now;

    if (!cachedStatus) {
      return res.status(403).json({
        error: 'event_not_active',
        message: 'Etkinlik henüz başlamadı',
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

// Reset cache when event status changes (called from admin controller)
eventActive.resetCache = () => {
  cachedStatus = null;
  cacheTime = 0;
};

module.exports = eventActive;
