const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Category = require('../models/Category');
const SavingGoal = require('../models/SavingGoal');
const mongoose = require('mongoose');

/**
 * GET /api/v1/notifications
 * Returns budget overrun alerts + savings milestone alerts for the logged-in user
 */
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        const notifications = [];

        // ── 1. Budget Overrun Alerts ─────────────────────────────────────────────
        const expenseCategories = await Category.find({ user: userId, type: 'expense' }).lean();

        // Get current month boundaries
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        for (const cat of expenseCategories) {
            if (!cat.budgetLimit || cat.budgetLimit <= 0) continue;

            const agg = await Expense.aggregate([
                {
                    $match: {
                        user: new mongoose.Types.ObjectId(userId),
                        category: cat.name,
                        date: { $gte: monthStart, $lte: monthEnd }
                    }
                },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);

            const spent = agg.length > 0 ? agg[0].total : 0;
            const pct   = (spent / cat.budgetLimit) * 100;

            if (pct >= 100) {
                notifications.push({
                    id: `budget-over-${cat._id}`,
                    type: 'danger',
                    icon: 'fa-solid fa-triangle-exclamation',
                    title: `Budget exceeded: ${cat.name}`,
                    message: `You've spent ${pct.toFixed(0)}% of your ${cat.name} budget this month.`,
                    category: cat.name,
                    spent,
                    limit: cat.budgetLimit,
                    createdAt: new Date()
                });
            } else if (pct >= 80) {
                notifications.push({
                    id: `budget-warn-${cat._id}`,
                    type: 'warning',
                    icon: 'fa-solid fa-circle-exclamation',
                    title: `Budget warning: ${cat.name}`,
                    message: `You've used ${pct.toFixed(0)}% of your ${cat.name} budget this month.`,
                    category: cat.name,
                    spent,
                    limit: cat.budgetLimit,
                    createdAt: new Date()
                });
            }
        }

        // ── 2. Savings Goal Milestone Alerts ─────────────────────────────────────
        const goals = await SavingGoal.find({ user: userId }).lean();

        for (const goal of goals) {
            if (!goal.targetAmount || goal.targetAmount <= 0) continue;
            const pct = (goal.currentAmount / goal.targetAmount) * 100;

            const milestones = [
                { threshold: 100, type: 'success', label: '🎉 Goal reached!' },
                { threshold: 75,  type: 'info',    label: '75% milestone' },
                { threshold: 50,  type: 'info',    label: '50% milestone' },
                { threshold: 25,  type: 'info',    label: '25% milestone' }
            ];

            for (const m of milestones) {
                if (pct >= m.threshold) {
                    notifications.push({
                        id: `goal-${m.threshold}-${goal._id}`,
                        type: m.type,
                        icon: pct >= 100 ? 'fa-solid fa-trophy' : 'fa-solid fa-piggy-bank',
                        title: `${m.label}: ${goal.title}`,
                        message: `You've saved ${pct.toFixed(0)}% toward your "${goal.title}" goal!`,
                        goalId: goal._id,
                        createdAt: new Date()
                    });
                    break; // only top milestone per goal
                }
            }
        }

        // ── 3. Recurring Due Soon ─────────────────────────────────────────────────
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 2);

        const dueExpenses = await Expense.find({
            user: userId,
            isRecurring: true,
            nextDueDate: { $gte: now, $lte: tomorrow }
        }).lean();

        const dueIncomes = await Income.find({
            user: userId,
            isRecurring: true,
            nextDueDate: { $gte: now, $lte: tomorrow }
        }).lean();

        for (const tx of [...dueExpenses, ...dueIncomes]) {
            notifications.push({
                id: `recurring-${tx._id}`,
                type: 'info',
                icon: 'fa-solid fa-rotate',
                title: `Recurring due: ${tx.title}`,
                message: `"${tx.title}" is due on ${new Date(tx.nextDueDate).toLocaleDateString()}.`,
                createdAt: new Date()
            });
        }

        res.status(200).json({ notifications, count: notifications.length });

    } catch (error) {
        console.error('Notification Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
