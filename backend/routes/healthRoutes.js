const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getHealthScore } = require('../controllers/healthScoreController');

router.get('/', protect, getHealthScore);

module.exports = router;
