const express = require('express');
const router = express.Router();
const {
    getAllUsers,
    getSystemStats,
    deleteUser,
    getTransactions,
    deleteTransaction,
    changeAdminPassword
} = require('../controllers/adminController');
const { getReportData } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');
const { cacheGet30s, clearApiCache } = require('../middleware/responseCache');

router.get('/users', protect, admin, cacheGet30s(), getAllUsers);
router.get('/stats', protect, admin, cacheGet30s(), getSystemStats);
router.get('/reports', protect, admin, cacheGet30s(), getReportData);
router.get('/transactions', protect, admin, getTransactions);

router.delete('/users/:id', protect, admin, clearApiCache, deleteUser);
router.delete('/transactions/:type/:id', protect, admin, deleteTransaction);

router.put('/change-password', protect, admin, changeAdminPassword);

module.exports = router;
