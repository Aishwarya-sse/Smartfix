const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const auth = require('../middleware/auth');

router.post('/chat', auth, agentController.chat);
router.post('/transcribe', auth, agentController.transcribe);
router.get('/conversations', auth, agentController.getUserConversations);
router.get('/history/:conversationId', auth, agentController.getHistory);
router.post('/resolve-support', auth, agentController.resolveSupport);
router.get('/admin/escalations', auth, agentController.adminGetEscalations);
router.post('/admin/reply', auth, agentController.adminReply);

module.exports = router;
