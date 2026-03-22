const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

async function seedAdmin() {
  const email = 'admin@test.com';
  const password = 'Test1234';
  const fullName = 'Admin';
  const role = 'admin';

  try {
    // Zaten var mi kontrol et
    const { rows } = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (rows.length > 0) {
      console.log('Admin hesabi zaten mevcut:', email);
      process.exit(0);
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);
    const secret = speakeasy.generateSecret({ length: 20 });

    await db.query(
      'INSERT INTO users (id, email, password_hash, full_name, role, qr_secret) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, email, passwordHash, fullName, role, secret.base32]
    );

    console.log('Admin hesabi olusturuldu!');
    console.log('Email:', email);
    console.log('Sifre:', password);
    process.exit(0);
  } catch (err) {
    console.error('Hata:', err.message);
    process.exit(1);
  }
}

seedAdmin();
