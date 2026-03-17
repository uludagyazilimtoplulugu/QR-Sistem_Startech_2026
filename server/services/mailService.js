const transporter = require('../config/mail');

async function sendPasswordResetCode(email, code, fullName) {
  if (!transporter) {
    console.warn('⚠️ SMTP yapilandirilmamis, kod:', code);
    return;
  }

  await transporter.sendMail({
    from: `"QR Etkinlik Sistemi" <${transporter.options.auth.user}>`,
    to: email,
    subject: 'Sifre Sifirlama Kodu',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a2e;">Merhaba ${fullName},</h2>
        <p>Sifre sifirlama kodunuz:</p>
        <div style="background: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a2e;">${code}</span>
        </div>
        <p style="color: #666;">Bu kod 15 dakika gecerlidir.</p>
        <p style="color: #999; font-size: 12px;">Bu islemi siz yapmadiyseniz bu e-postayi gormezden gelin.</p>
      </div>
    `,
  });
}

module.exports = { sendPasswordResetCode };
