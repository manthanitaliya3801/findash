const express = require('express');
const { addGoal, getGoals, updateGoal, deleteGoal } = require('../controllers/savingController');
const { protect } = require('../middleware/authMiddleware');
const { cacheGet30s, clearApiCache } = require('../middleware/responseCache');

const router = express.Router();

router.post('/add-goal', protect, clearApiCache, addGoal)
    .get('/get-goals', protect, cacheGet30s(), getGoals)
    .put('/update-goal/:id', protect, clearApiCache, updateGoal)
    .delete('/delete-goal/:id', protect, clearApiCache, deleteGoal);

module.exports = router;
