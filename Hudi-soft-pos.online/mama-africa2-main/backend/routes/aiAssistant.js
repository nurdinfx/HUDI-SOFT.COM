// backend/routes/aiAssistant.js
import express from 'express';
import { auth, requirePermission } from '../middleware/auth.js';
import {
  queryAssistant,
  getProactiveInsights
} from '../controllers/aiAssistantController.js';

const router = express.Router();

// Enforce auth and AI Assistant permission
router.use(auth);
router.use(requirePermission('aiAssistant'));

// Query AI Business Assistant
router.post('/query', queryAssistant);

// Get proactive business intelligence insights
router.get('/insights', getProactiveInsights);

export default router;
