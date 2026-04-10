const express = require('express');
const router = express.Router();
console.log("Auth Routes File Loaded");
const { registerUser, loginUser } = require('../controllers/authController');
const { cacheGet30s, clearApiCache } = require('../middleware/responseCache');

router.post('/register', clearApiCache, registerUser);
router.post('/login', loginUser);

// Protected Routes
const { protect } = require('../middleware/authMiddleware');
const { getProfile, updateProfile } = require('../controllers/authController');

router.get('/profile', protect, cacheGet30s(), getProfile);
router.put('/profile', protect, clearApiCache, updateProfile);

module.exports = router;
