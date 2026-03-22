const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config/env');

const app = express();

// Nginx reverse proxy arkasinda calistigimiz icin
app.set('trust proxy', 1);

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      mediaSrc: ["'self'", "blob:"],
      workerSrc: ["'self'"],
    },
  },
}));

app.use(cors({
  origin: config.nodeEnv === 'production' ? false : true,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static files (PWA frontend)
app.use(express.static(path.join(__dirname, '..', 'public')));

// ============================================================================
// API ROUTES
// ============================================================================

const authRoutes = require('./routes/auth');
const qrRoutes = require('./routes/qr');
const scanRoutes = require('./routes/scan');
const approvalRoutes = require('./routes/approval');
const roomRoutes = require('./routes/rooms');
const surpriseRoutes = require('./routes/surprise');
const userRoutes = require('./routes/user');
const leaderboardRoutes = require('./routes/leaderboard');
const adminRoutes = require('./routes/admin');

// Public event status endpoint (tum login olan kullanicilar erisebilir)
const authMiddleware = require('./middleware/auth');
const EventSettings = require('./models/EventSettings');
app.get('/api/event/status', authMiddleware, async (req, res) => {
  const settings = await EventSettings.get();
  res.json({ event: settings });
});

app.use('/api/auth', authRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/code', require('./routes/scan').codeRouter);
app.use('/api/approval', approvalRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/surprise', surpriseRoutes);
app.use('/api/user', userRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/registration', require('./routes/registration'));

// ============================================================================
// SPA FALLBACK - all non-API routes serve index.html
// ============================================================================

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  }
});

// ============================================================================
// ERROR HANDLER
// ============================================================================

app.use((err, req, res, _next) => {
  console.error('❌ Server Error:', err.message);
  if (config.nodeEnv === 'development') {
    console.error(err.stack);
  }
  res.status(err.status || 500).json({
    error: 'server_error',
    message: config.nodeEnv === 'development' ? err.message : 'Sunucu hatasi',
  });
});

// ============================================================================
// CLEANUP SERVICE
// ============================================================================

const cleanupService = require('./services/cleanupService');
cleanupService.start();

// ============================================================================
// START SERVER
// ============================================================================

app.listen(config.port, () => {
  console.log(`🚀 QR Sistem sunucusu calisiyor: http://localhost:${config.port}`);
  console.log(`📁 Ortam: ${config.nodeEnv}`);
});

module.exports = app;
