const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Category = require('../models/Category');
const mongoose = require('mongoose');

/**
 * GET /api/v1/recurring
 * Returns all recurring income + expense transactions for the user
 */
exports.getRecurring = async (req, res) => {
    try {
        const userId = req.user._id;

        const [incomes, expenses] = await Promise.all([
            Income.find({ user: userId, isRecurring: true }).sort({ nextDueDate: 1 }).lean(),
            Expense.find({ user: userId, isRecurring: true }).sort({ nextDueDate: 1 }).lean()
        ]);

        const recurring = [
            ...incomes.map(i => ({ ...i, entryType: 'income' })),
            ...expenses.map(e => ({ ...e, entryType: 'expense' }))
        ].sort((a, b) => {
            const aDate = a.nextDueDate ? new Date(a.nextDueDate) : new Date(a.date);
            const bDate = b.nextDueDate ? new Date(b.nextDueDate) : new Date(b.date);
            return aDate - bDate;
        });

        res.status(200).json({ recurring });
    } catch (error) {
        console.error('Recurring Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * GET /api/v1/budget/suggestions
 * Returns AI-style budget suggestions per category based on 3-month average spend
 */
exports.getBudgetSuggestions = async (req, res) => {
    try {
        const userId = req.user._id;

        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const expenses = await Expense.find({
            user: userId,
            date: { $gte: threeMonthsAgo }
        }).lean();

        // Aggregate by category
        const catMap = {};
        expenses.forEach(e => {
            if (!catMap[e.category]) catMap[e.category] = { total: 0, months: new Set() };
            catMap[e.category].total += e.amount;
            const monthKey = `${new Date(e.date).getFullYear()}-${new Date(e.date).getMonth()}`;
            catMap[e.category].months.add(monthKey);
        });

        // Get existing categories with their current budget limits
        const categories = await Category.find({ user: userId, type: 'expense' }).lean();
        const catLimitMap = {};
        categories.forEach(c => { catLimitMap[c.name] = { id: c._id, limit: c.budgetLimit }; });

        const suggestions = Object.entries(catMap).map(([name, data]) => {
            const months = data.months.size || 1;
            const avgMonthly = data.total / months;
            const suggested = Math.ceil(avgMonthly * 1.1); // 10% buffer
            const current = catLimitMap[name]?.limit || 0;
            const categoryId = catLimitMap[name]?.id || null;

            return {
                category: name,
                avgMonthlySpend: Math.round(avgMonthly),
                suggestedLimit: suggested,
                currentLimit: current,
                categoryId,
                improvement: current > suggested ? Math.round(current - suggested) : 0,
                status: current <= 0 ? 'unset' : current >= suggested ? 'ok' : 'low'
            };
        });

        suggestions.sort((a, b) => b.avgMonthlySpend - a.avgMonthlySpend);

        res.status(200).json({ suggestions });
    } catch (error) {
        console.error('Budget Suggestions Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * GET /api/v1/reports/monthly-comparison
 * Returns month-over-month income/expense comparison for the last 12 months
 */
exports.getMonthlyComparison = async (req, res) => {
    try {
        const userId = req.user._id;

        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        twelveMonthsAgo.setDate(1);

        const [incomes, expenses] = await Promise.all([
            Income.find({ user: userId, date: { $gte: twelveMonthsAgo } }).lean(),
            Expense.find({ user: userId, date: { $gte: twelveMonthsAgo } }).lean()
        ]);

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const result = {};

        for (let i = 11; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            result[key] = {
                label: months[d.getMonth()] + " '" + String(d.getFullYear()).slice(2),
                income: 0,
                expense: 0
            };
        }

        incomes.forEach(inc => {
            const d = new Date(inc.date);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            if (result[key]) result[key].income += inc.amount;
        });

        expenses.forEach(exp => {
            const d = new Date(exp.date);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            if (result[key]) result[key].expense += exp.amount;
        });

        const comparison = Object.values(result);
        res.status(200).json({ comparison });
    } catch (error) {
        console.error('Monthly Comparison Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
