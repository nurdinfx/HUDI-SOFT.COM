const express = require('express');
const router = express.Router();
const { query } = require('../db/pool');

/** GET /api/notifications */
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM notifications WHERE clinic_id=$1 AND (user_id=$2 OR user_id IS NULL)
       ORDER BY created_at DESC LIMIT 50`,
      [req.user.clinic_id, req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/** PUT /api/notifications/:id/read */
router.put('/:id/read', async (req, res) => {
  try {
    await query('UPDATE notifications SET is_read=true WHERE id=$1 AND clinic_id=$2', [req.params.id, req.user.clinic_id]);
    res.json({ message: 'Marked as read' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/** PUT /api/notifications/read-all */
router.put('/read-all', async (req, res) => {
  try {
    await query('UPDATE notifications SET is_read=true WHERE clinic_id=$1 AND user_id=$2', [req.user.clinic_id, req.user.id]);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
