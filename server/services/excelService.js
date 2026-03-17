const XLSX = require('xlsx');

/**
 * CSV dosyasini parse et → [{email, role}]
 */
function parseCSV(buffer) {
  const content = buffer.toString('utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  const entries = [];

  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split(',').map(s => s.trim().toLowerCase());
    if (!parts[0] || !parts[0].includes('@')) continue; // Skip invalid
    if (i === 0 && (parts[0] === 'email' || parts[0] === 'e-posta')) continue; // Skip header

    entries.push({
      email: parts[0],
      role: isValidRole(parts[1]) ? parts[1] : 'participant',
    });
  }

  return entries;
}

/**
 * Excel dosyasini parse et → [{email, role: 'participant'}]
 * Excel'e sadece e-posta eklenir, otomatik participant olur
 */
function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const entries = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;
    const email = String(row[0]).trim().toLowerCase();
    if (!email.includes('@')) continue;
    if (i === 0 && (email === 'email' || email === 'e-posta')) continue; // Skip header

    entries.push({ email, role: 'participant' });
  }

  return entries;
}

function isValidRole(role) {
  return ['admin', 'mentor', 'startup', 'participant', 'gorevli'].includes(role);
}

module.exports = { parseCSV, parseExcel };
