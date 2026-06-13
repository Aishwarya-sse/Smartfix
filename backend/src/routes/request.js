const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const auth = require('../middleware/auth');

router.post('/create', auth, requestController.createRequest);
router.post('/assign-partner', auth, requestController.assignPartner);
router.post('/escalate', auth, requestController.escalateRequest);
router.get('/user-requests', auth, requestController.getUserRequests);
router.get('/partner-requests', auth, requestController.getPartnerRequests);
router.post('/update-status', auth, requestController.updateRequestStatus);
router.post('/pickup', auth, requestController.pickupRequest);
router.post('/schedule', auth, requestController.scheduleRequest);
router.post('/feedback', auth, requestController.submitFeedback);

// Admin routes
router.get('/admin/all', auth, requestController.adminGetAllRequests);
router.get('/admin/partners', auth, requestController.adminGetAllPartners);
router.post('/admin/reassign', auth, requestController.adminReassignRequest);
router.post('/admin/suspend', auth, requestController.adminSuspendRequest);
router.get('/admin/leaderboard', auth, requestController.adminGetLeaderboard);
router.post('/partner/withdraw', auth, requestController.partnerWithdraw);

// Admin Chat routes
router.get('/admin/chats', auth, requestController.adminGetChats);
router.post('/admin/chats/:id/reply', auth, requestController.adminReplyChat);
router.post('/admin/chats/:id/close', auth, requestController.adminCloseChat);

module.exports = router;
