const express = require('express');
const { addExpense, getExpenses, deleteExpense, updateExpense } = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');
const { cacheGet30s, clearApiCache } = require('../middleware/responseCache');

const router = express.Router();

router.post('/add-expense', protect, clearApiCache, addExpense)
    .get('/get-expenses', protect, cacheGet30s(), getExpenses)
    .delete('/delete-expense/:id', protect, clearApiCache, deleteExpense)
    .put('/update-expense/:id', protect, clearApiCache, updateExpense)

module.exports = router;
