const express = require('express');
const { addCategory, getCategories, deleteCategory, updateCategory } = require('../controllers/categoryController');
const { protect } = require('../middleware/authMiddleware');
const { cacheGet30s, clearApiCache } = require('../middleware/responseCache');

const router = express.Router();

router.post('/add-category', protect, clearApiCache, addCategory)
    .get('/get-categories', protect, cacheGet30s(), getCategories)
    .put('/update-category/:id', protect, clearApiCache, updateCategory)
    .delete('/delete-category/:id', protect, clearApiCache, deleteCategory);

module.exports = router;
