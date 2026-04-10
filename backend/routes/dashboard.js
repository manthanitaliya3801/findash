const router = require('express').Router();
const { getDashboardData } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');
const { cacheGet30s } = require('../middleware/responseCache');


router.get('/', protect, cacheGet30s(), getDashboardData);

module.exports = router;
