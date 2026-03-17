const surpriseService = require('../services/surpriseService');

/**
 * POST /api/surprise/redeem
 * Body: { code }
 */
async function redeem(req, res) {
  const { code } = req.body;

  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    return res.status(400).json({ error: 'missing_code', message: 'Kod gerekli' });
  }

  const result = await surpriseService.redeemCode(req.user.id, code);
  const statusCode = result.status === 'error' ? 400 : 200;
  res.status(statusCode).json(result);
}

module.exports = { redeem };
