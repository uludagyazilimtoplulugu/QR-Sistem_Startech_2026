const db = require('../config/database');

const PointConfig = {
  async getAll() {
    const { rows } = await db.query('SELECT * FROM point_config');
    return rows;
  },

  async getByRole(role) {
    const { rows } = await db.query('SELECT points_value FROM point_config WHERE role = $1', [role]);
    return rows[0] ? rows[0].points_value : 0;
  },

  async update(role, pointsValue) {
    await db.query(
      'UPDATE point_config SET points_value = $1 WHERE role = $2',
      [pointsValue, role]
    );
  },
};

module.exports = PointConfig;
