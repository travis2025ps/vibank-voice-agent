// In backend/routes/chat.js

const express = require('express');
const router = express.Router();
const { getHistory, getWaitingQueue, saveHistory } = require('../controllers/chatController');

router.get('/history/:email', getHistory);
router.get('/queue', getWaitingQueue); // New route for agents
router.post('/history', saveHistory);

module.exports = router;