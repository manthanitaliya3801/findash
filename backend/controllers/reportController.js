const User = require('../models/User');
const Income = require('../models/Income');
const Expense = require('../models/Expense');

exports.getReportData = async (req, res) => {
    try {
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

        const [
            totalUsers,
            thisMonthUsers,
            lastMonthUsers,
            incomeSummary,
            expenseSummary,
            thisMonthIncome,
            thisMonthExpense,
            lastMonthIncome,
            lastMonthExpense,
            monthlyIncome,
            monthlyExpense,
            topIncomeCategories,
            topExpenseCategories,
            perUserStats,
            recentTransactions
        ] = await Promise.all([
            // Total users
            User.countDocuments(),

            // This month new users
            User.countDocuments({ createdAt: { $gte: thisMonthStart } }),

            // Last month new users
            User.countDocuments({ createdAt: { $gte: lastMonthStart, $lt: thisMonthStart } }),

            // All-time income total
            Income.aggregate([
                { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
            ]),

            // All-time expense total
            Expense.aggregate([
                { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
            ]),

            // This month income
            Income.aggregate([
                { $match: { date: { $gte: thisMonthStart } } },
                { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
            ]),

            // This month expense
            Expense.aggregate([
                { $match: { date: { $gte: thisMonthStart } } },
                { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
            ]),

            // Last month income
            Income.aggregate([
                { $match: { date: { $gte: lastMonthStart, $lt: thisMonthStart } } },
                { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
            ]),

            // Last month expense
            Expense.aggregate([
                { $match: { date: { $gte: lastMonthStart, $lt: thisMonthStart } } },
                { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
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

            // Top income categories
            Income.aggregate([
                { $group: { _id: '$category', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
                { $sort: { totalAmount: -1 } },
                { $limit: 5 }
            ]),

            // Top expense categories
            Expense.aggregate([
                { $group: { _id: '$category', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
                { $sort: { totalAmount: -1 } },
                { $limit: 5 }
            ]),

            // Per-user stats (top 10 by volume)
            Promise.all([
                Income.aggregate([
                    { $group: { _id: '$user', totalIncome: { $sum: '$amount' }, incomeCount: { $sum: 1 } } }
                ]),
                Expense.aggregate([
                    { $group: { _id: '$user', totalExpense: { $sum: '$amount' }, expenseCount: { $sum: 1 } } }
                ])
            ]).then(async ([incomeByUser, expenseByUser]) => {
                const userMap = new Map();
                incomeByUser.forEach(u => {
                    userMap.set(u._id.toString(), { income: u.totalIncome, incomeCount: u.incomeCount, expense: 0, expenseCount: 0 });
                });
                expenseByUser.forEach(u => {
                    const key = u._id.toString();
                    const existing = userMap.get(key) || { income: 0, incomeCount: 0, expense: 0, expenseCount: 0 };
                    existing.expense = u.totalExpense;
                    existing.expenseCount = u.expenseCount;
                    userMap.set(key, existing);
                });

                const userIds = [...userMap.keys()];
                const users = await User.find({ _id: { $in: userIds } }, { name: 1, email: 1 }).lean();
                const userLookup = new Map(users.map(u => [u._id.toString(), u]));

                const results = [];
                userMap.forEach((stats, id) => {
                    const user = userLookup.get(id);
                    results.push({
                        name: user?.name || 'Deleted User',
                        email: user?.email || '',
                        income: stats.income,
                        expense: stats.expense,
                        volume: stats.income + stats.expense,
                        net: stats.income - stats.expense,
                        transactions: stats.incomeCount + stats.expenseCount
                    });
                });

                results.sort((a, b) => b.volume - a.volume);
                return results.slice(0, 10);
            }),

            // Recent 10 transactions
            Promise.all([
                Income.find().sort({ createdAt: -1 }).limit(10).populate('user', 'name').lean(),
                Expense.find().sort({ createdAt: -1 }).limit(10).populate('user', 'name').lean()
            ]).then(([incomes, expenses]) => {
                const all = [
                    ...incomes.map(i => ({ ...i, type: 'income' })),
                    ...expenses.map(e => ({ ...e, type: 'expense' }))
                ];
                all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                return all.slice(0, 10).map(t => ({
                    title: t.title || t.category,
                    amount: t.amount,
                    type: t.type,
                    category: t.category,
                    date: t.date,
                    userName: t.user?.name || 'Unknown'
                }));
            })
        ]);

        // Build monthly trend
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyTrend = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = d.getFullYear();
            const month = d.getMonth() + 1;
            const inc = monthlyIncome.find(m => m._id.year === year && m._id.month === month);
            const exp = monthlyExpense.find(m => m._id.year === year && m._id.month === month);
            monthlyTrend.push({
                label: monthNames[d.getMonth()] + ' ' + year.toString().slice(-2),
                income: inc?.total || 0,
                expense: exp?.total || 0,
                net: (inc?.total || 0) - (exp?.total || 0)
            });
        }

        // Growth calculations
        const thisMonthIncomeTotal = thisMonthIncome[0]?.total || 0;
        const lastMonthIncomeTotal = lastMonthIncome[0]?.total || 0;
        const thisMonthExpenseTotal = thisMonthExpense[0]?.total || 0;
        const lastMonthExpenseTotal = lastMonthExpense[0]?.total || 0;

        const calcGrowth = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous * 100);
        };

        res.json({
            overview: {
                totalUsers,
                totalIncome: incomeSummary[0]?.total || 0,
                totalExpense: expenseSummary[0]?.total || 0,
                totalTransactions: (incomeSummary[0]?.count || 0) + (expenseSummary[0]?.count || 0),
                netProfit: (incomeSummary[0]?.total || 0) - (expenseSummary[0]?.total || 0)
            },
            growth: {
                usersThisMonth: thisMonthUsers,
                usersLastMonth: lastMonthUsers,
                userGrowth: calcGrowth(thisMonthUsers, lastMonthUsers),
                incomeGrowth: calcGrowth(thisMonthIncomeTotal, lastMonthIncomeTotal),
                expenseGrowth: calcGrowth(thisMonthExpenseTotal, lastMonthExpenseTotal),
                thisMonthIncome: thisMonthIncomeTotal,
                thisMonthExpense: thisMonthExpenseTotal,
                lastMonthIncome: lastMonthIncomeTotal,
                lastMonthExpense: lastMonthExpenseTotal
            },
            monthlyTrend,
            topIncomeCategories: topIncomeCategories.map(c => ({
                category: c._id || 'Other', amount: c.totalAmount, count: c.count
            })),
            topExpenseCategories: topExpenseCategories.map(c => ({
                category: c._id || 'Other', amount: c.totalAmount, count: c.count
            })),
            perUserStats,
            recentTransactions
        });
    } catch (error) {
        console.error('Report Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
