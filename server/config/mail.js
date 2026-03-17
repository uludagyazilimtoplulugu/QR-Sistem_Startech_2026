const nodemailer = require('nodemailer');
const config = require('./env');

let transporter = null;

if (config.smtp.user && config.smtp.pass) {
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });

  transporter.verify()
    .then(() => console.log('✅ SMTP baglantisi basarili'))
    .catch(err => console.warn('⚠️ SMTP baglanti hatasi:', err.message));
} else {
  console.warn('⚠️ SMTP yapilandirilmamis, e-posta gonderilemeyecek');
}

module.exports = transporter;
