const { Pool } = require('pg');
const config = require('./env');

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.query('SELECT NOW()')
  .then(() => console.log('✅ PostgreSQL baglantisi basarili'))
  .catch(err => console.error('❌ PostgreSQL baglanti hatasi:', err.message));

module.exports = pool;
