const express = require('express');
const router = express.Router();
const { exportBackup, restoreBackup, listBackups, downloadServerBackup } = require('../controllers/backupController');

// GET  /api/backup/export        — download full backup JSON
router.get('/export', exportBackup);

// GET  /api/backup/list          — list server-side backups
router.get('/list', listBackups);

// GET  /api/backup/download/:f   — download a server backup file
router.get('/download/:filename', downloadServerBackup);

// POST /api/backup/restore       — restore from uploaded JSON (body = backup JSON)
router.post('/restore', express.json({ limit: '50mb' }), restoreBackup);

module.exports = router;
