const rateLimit = require('express-rate-limit');

// Auth endpoints: development'ta rahat, production'da sıkı
const isDev = process.env.NODE_ENV !== 'production';
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 10,
  message: { error: 'rate_limit', message: 'Çok fazla deneme. 15 dakika sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Scan endpoints: 30 requests per minute per IP
const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'rate_limit', message: 'Çok fazla tarama denemesi. Biraz bekleyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API: 100 requests per minute per IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'rate_limit', message: 'Çok fazla istek. Biraz bekleyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, scanLimiter, generalLimiter };
