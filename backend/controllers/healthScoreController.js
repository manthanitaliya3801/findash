const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Category = require('../models/Category');
const SavingGoal = require('../models/SavingGoal');
const mongoose = require('mongoose');

/**
 * GET /api/v1/health-score
 * Returns a 0-100 financial health score with sub-scores and tips.
 */
exports.getHealthScore = async (req, res) => {
    try {
        const userId = req.user._id;
        const now = new Date();

        // ── Last 3 months window ──────────────────────────────────────────────────
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const [incomes, expenses, categories, goals] = await Promise.all([
            Income.find({ user: userId, date: { $gte: threeMonthsAgo } }).lean(),
            Expense.find({ user: userId, date: { $gte: threeMonthsAgo } }).lean(),
            Category.find({ user: userId, type: 'expense' }).lean(),
            SavingGoal.find({ user: userId }).lean()
        ]);

        const totalIncome  = incomes.reduce((s, i) => s + i.amount, 0);
        const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);

        // ── Sub-score 1: Savings Rate (0-35 pts) ─────────────────────────────────
        // 20%+ savings rate = full marks
        let savingsRateScore = 0;
        const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
        if (savingsRate >= 20) savingsRateScore = 35;
        else if (savingsRate >= 10) savingsRateScore = 25;
        else if (savingsRate >= 5)  savingsRateScore = 15;
        else if (savingsRate > 0)   savingsRateScore = 8;
        else                        savingsRateScore = 0;

        // ── Sub-score 2: Budget Adherence (0-30 pts) ──────────────────────────────
        let budgetScore = 30; // start full, deduct for overruns
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        let overrunCount = 0;
        let catWithBudget = 0;
        for (const cat of categories) {
            if (!cat.budgetLimit || cat.budgetLimit <= 0) continue;
            catWithBudget++;
            const spent = expenses
                .filter(e => e.category === cat.name &&
                    new Date(e.date) >= monthStart &&
                    new Date(e.date) <= monthEnd)
                .reduce((s, e) => s + e.amount, 0);
            if (spent > cat.budgetLimit) overrunCount++;
        }

        if (catWithBudget === 0) {
            budgetScore = 10; // no budgets set, partial credit
        } else {
            const adherenceRate = (catWithBudget - overrunCount) / catWithBudget;
            budgetScore = Math.round(adherenceRate * 30);
        }

        // ── Sub-score 3: Income Consistency (0-20 pts) ────────────────────────────
        // Group incomes by month; penalise months with zero income
        let consistencyScore = 0;
        const monthlyIncome = {};
        incomes.forEach(i => {
            const key = `${new Date(i.date).getFullYear()}-${new Date(i.date).getMonth()}`;
            monthlyIncome[key] = (monthlyIncome[key] || 0) + i.amount;
        });
        const monthsWithIncome = Object.values(monthlyIncome).filter(v => v > 0).length;
        consistencyScore = Math.round((monthsWithIncome / 3) * 20);

        // ── Sub-score 4: Active Saving Goals (0-15 pts) ───────────────────────────
        const activeGoals = goals.filter(g => g.currentAmount < g.targetAmount).length;
        let goalScore = 0;
        if (activeGoals >= 3) goalScore = 15;
        else if (activeGoals === 2) goalScore = 10;
        else if (activeGoals === 1) goalScore = 5;

        const totalScore = Math.min(100, savingsRateScore + budgetScore + consistencyScore + goalScore);

        // ── Tips based on scores ──────────────────────────────────────────────────
        const tips = [];
        if (savingsRateScore < 20) tips.push('Try to save at least 20% of your monthly income.');
        if (budgetScore < 20) tips.push('Set and stick to per-category budget limits to improve adherence.');
        if (consistencyScore < 15) tips.push('Ensure you log income every month for a clearer picture.');
        if (goalScore === 0) tips.push('Add at least one savings goal to stay motivated!');
        if (totalScore >= 80) tips.push('Great work! Keep up these excellent financial habits. 🎉');

        let grade = 'F';
        if (totalScore >= 90) grade = 'A+';
        else if (totalScore >= 80) grade = 'A';
        else if (totalScore >= 70) grade = 'B';
        else if (totalScore >= 60) grade = 'C';
        else if (totalScore >= 50) grade = 'D';

        res.status(200).json({
            totalScore,
            grade,
            subscores: {
                savingsRate: { score: savingsRateScore, max: 35, label: 'Savings Rate', value: savingsRate.toFixed(1) },
                budgetAdherence: { score: budgetScore, max: 30, label: 'Budget Adherence', value: catWithBudget > 0 ? `${catWithBudget - overrunCount}/${catWithBudget} categories` : 'No budgets set' },
                incomeConsistency: { score: consistencyScore, max: 20, label: 'Income Consistency', value: `${monthsWithIncome}/3 months` },
                activeGoals: { score: goalScore, max: 15, label: 'Saving Goals', value: `${activeGoals} active goals` }
            },
            tips
        });

    } catch (error) {
        console.error('Health Score Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
