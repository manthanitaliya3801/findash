const User = require('../models/User');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const bcrypt = require('bcryptjs');

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes — admin data doesn't change often
const adminCache = {
    users: { timestamp: 0, data: null },
    stats: { timestamp: 0, data: null }
};

const isCacheFresh = (entry) => Boolean(entry?.data) && (Date.now() - entry.timestamp) < CACHE_TTL_MS;

const setCache = (key, data) => {
    adminCache[key] = {
        timestamp: Date.now(),
        data
    };
    return data;
};

const clearAdminCache = () => {
    Object.keys(adminCache).forEach(key => {
        adminCache[key] = { timestamp: 0, data: null };
    });
};

exports.getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const cacheKey = `users_page${page}_limit${limit}`;

        if (isCacheFresh(adminCache[cacheKey])) {
            return res.json(adminCache[cacheKey].data);
        }

        const [users, total] = await Promise.all([
            User.find({}, { password: 0 })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments()
        ]);

        const responseData = {
            users,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            totalUsers: total
        };

        adminCache[cacheKey] = {
            timestamp: Date.now(),
            data: responseData
        };

        res.json(responseData);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getSystemStats = async (req, res) => {
    try {
        if (isCacheFresh(adminCache.stats)) {
            return res.json(adminCache.stats.data);
        }

        // Get current date info for monthly trends
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

        const [
            totalUsers,
            recentUsers,
            incomeSummary,
            expenseSummary,
            monthlyIncome,
            monthlyExpense,
            topExpenseCategories,
            recentTransactions
        ] = await Promise.all([
            // Total users
            User.countDocuments({}),

            // Last 5 registered users
            User.find({}, { password: 0, __v: 0 })
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),

            // Income totals
            Income.aggregate([
                { $group: { _id: null, totalAmount: { $sum: '$amount' }, totalCount: { $sum: 1 } } }
            ]),

            // Expense totals
            Expense.aggregate([
                { $group: { _id: null, totalAmount: { $sum: '$amount' }, totalCount: { $sum: 1 } } }
            ]),

            // Monthly income (last 6 months)
            Income.aggregate([
                { $match: { date: { $gte: sixMonthsAgo } } },
                {
                    $group: {
                        _id: { year: { $year: '$date' }, month: { $month: '$date' } },
                        total: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]),

            // Monthly expense (last 6 months)
            Expense.aggregate([
                { $match: { date: { $gte: sixMonthsAgo } } },
                {
                    $group: {
                        _id: { year: { $year: '$date' }, month: { $month: '$date' } },
                        total: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]),

            // Top 5 expense categories
            Expense.aggregate([
                { $group: { _id: '$category', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
                { $sort: { totalAmount: -1 } },
                { $limit: 5 }
            ]),

            // Recent 8 transactions (income + expense combined)
            Promise.all([
                Income.find().sort({ createdAt: -1 }).limit(8).populate('user', 'name email').lean(),
                Expense.find().sort({ createdAt: -1 }).limit(8).populate('user', 'name email').lean()
            ]).then(([incomes, expenses]) => {
                const all = [
                    ...incomes.map(i => ({ ...i, type: 'income' })),
                    ...expenses.map(e => ({ ...e, type: 'expense' }))
                ];
                all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                return all.slice(0, 8);
            })
        ]);

        const totalIncomeCount = incomeSummary[0]?.totalCount || 0;
        const totalExpenseCount = expenseSummary[0]?.totalCount || 0;
        const totalIncomeAmount = incomeSummary[0]?.totalAmount || 0;
        const totalExpenseAmount = expenseSummary[0]?.totalAmount || 0;

        // Build monthly trend data (last 6 months)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyTrend = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = d.getFullYear();
            const month = d.getMonth() + 1; // 1-indexed
            const incomeEntry = monthlyIncome.find(m => m._id.year === year && m._id.month === month);
            const expenseEntry = monthlyExpense.find(m => m._id.year === year && m._id.month === month);
            monthlyTrend.push({
                label: months[d.getMonth()] + ' ' + year.toString().slice(-2),
                income: incomeEntry?.total || 0,
                expense: expenseEntry?.total || 0
            });
        }

        const statsPayload = {
            totalUsers,
            totalTransactions: totalIncomeCount + totalExpenseCount,
            totalIncomeAmount,
            totalExpenseAmount,
            recentUsers,
            monthlyTrend,
            topExpenseCategories: topExpenseCategories.map(c => ({
                category: c._id || 'Other',
                amount: c.totalAmount,
                count: c.count
            })),
            recentTransactions: recentTransactions.map(t => ({
                _id: t._id,
                title: t.title || t.description || t.category,
                amount: t.amount,
                type: t.type,
                category: t.category,
                date: t.date,
                userName: t.user?.name || 'Unknown'
            }))
        };

        res.json(setCache('stats', statsPayload));
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            await Promise.all([
                Income.deleteMany({ user: user._id }),
                Expense.deleteMany({ user: user._id })
            ]);

            await user.deleteOne();
            clearAdminCache();
            res.json({ message: 'User removed' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getTransactions = async (req, res) => {
    try {
        const { userId, type, startDate, endDate, page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.$lte = end;
        }

        const buildMatch = (extraFilter = {}) => {
            const match = { ...extraFilter };
            if (userId) match.user = require('mongoose').Types.ObjectId.createFromHexString(userId);
            if (Object.keys(dateFilter).length) match.date = dateFilter;
            return match;
        };

        const incomeQuery = Income.find(buildMatch()).sort({ date: -1 }).populate('user', 'name email').lean();
        const expenseQuery = Expense.find(buildMatch()).sort({ date: -1 }).populate('user', 'name email').lean();

        let incomes = [];
        let expenses = [];

        if (type === 'income' || !type || type === 'all') {
            incomes = await incomeQuery;
        }
        if (type === 'expense' || !type || type === 'all') {
            expenses = await expenseQuery;
        }

        const combined = [
            ...incomes.map(i => ({ ...i, type: 'income' })),
            ...expenses.map(e => ({ ...e, type: 'expense' }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        const total = combined.length;
        const paginated = combined.slice(skip, skip + parseInt(limit));

        res.json({
            transactions: paginated.map(t => ({
                _id: t._id,
                title: t.title || t.description || t.category || 'Untitled',
                amount: t.amount,
                type: t.type,
                category: t.category,
                date: t.date,
                userName: t.user?.name || 'Unknown',
                userId: t.user?._id || t.user
            })),
            total,
            totalPages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page)
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.deleteTransaction = async (req, res) => {
    try {
        const { type, id } = req.params;
        if (type === 'income') {
            const doc = await Income.findByIdAndDelete(id);
            if (!doc) return res.status(404).json({ message: 'Transaction not found' });
        } else if (type === 'expense') {
            const doc = await Expense.findByIdAndDelete(id);
            if (!doc) return res.status(404).json({ message: 'Transaction not found' });
        } else {
            return res.status(400).json({ message: 'Invalid type. Use income or expense.' });
        }
        clearAdminCache();
        res.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.changeAdminPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        const user = await User.findById(req.user._id);
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        user.password = newPassword; // Model pre-save hook will hash it
        await user.save();
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
