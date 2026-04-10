const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getRecurring, getBudgetSuggestions, getMonthlyComparison } = require('../controllers/extendedController');

// GET all recurring transactions (income + expense)
router.get('/recurring', protect, getRecurring);

// GET smart budget suggestions
router.get('/budget/suggestions', protect, getBudgetSuggestions);

// GET monthly income/expense comparison (12 months)
router.get('/reports/monthly-comparison', protect, getMonthlyComparison);

module.exports = router;
