const express = require('express');
const { addIncome, getIncomes, deleteIncome, updateIncome } = require('../controllers/incomeController');
const { protect } = require('../middleware/authMiddleware');
const { cacheGet30s, clearApiCache } = require('../middleware/responseCache');

const router = express.Router();

router.post('/add-income', protect, clearApiCache, addIncome)
    .get('/get-incomes', protect, cacheGet30s(), getIncomes)
    .delete('/delete-income/:id', protect, clearApiCache, deleteIncome)
    .put('/update-income/:id', protect, clearApiCache, updateIncome)

module.exports = router;
