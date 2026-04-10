const Income = require("../models/Income")
const Expense = require("../models/Expense")
const mongoose = require('mongoose');

exports.getDashboardData = async (req, res) => {
    try {
        const userId = req.user._id

        // Debug
        // console.log("Dashboard Request for User ID:", userId);

        const totalIncomeAgg = await Income.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(userId) } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ])

        const totalExpenseAgg = await Expense.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(userId) } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ])

        const totalIncome = totalIncomeAgg.length > 0 ? totalIncomeAgg[0].total : 0
        const totalExpense = totalExpenseAgg.length > 0 ? totalExpenseAgg[0].total : 0
        const totalBalance = totalIncome - totalExpense

        // Recent History
        const recentIncomes = await Income.find({ user: userId }).sort({ date: -1 }).limit(5).lean()
        const recentExpenses = await Expense.find({ user: userId }).sort({ date: -1 }).limit(5).lean()

        const history = [...recentIncomes.map(i => ({ ...i, type: 'income' })), ...recentExpenses.map(e => ({ ...e, type: 'expense' }))]
        history.sort((a, b) => new Date(b.date) - new Date(a.date))
        const recentHistory = history.slice(0, 5)

        // Last 6 months data for charts
        // Simplified approach: get all data for last 6 months and group by month in JS or Mongo
        // Doing in JS for simplicity as efficient enough for user data usually
        // Or better, Mongo Aggregation for months.

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);



        res.status(200).json({
            totalIncome,
            totalExpense,
            totalBalance,
            recentHistory,
            // We can add chart data specifically if needed, 
            // but fetching all incomes/expenses for charts might still be needed 
            // unless we aggregate by month here. 
            // For now, let's Stick to the plan of optimizing the main numbers.
            // The frontend still needs full list for detailed view? 
            // The Dashboard only needs summary.
        })

    } catch (error) {
        console.error("Dashboard Data Error", error)
        res.status(500).json({ message: 'Server Error' })
    }
}
