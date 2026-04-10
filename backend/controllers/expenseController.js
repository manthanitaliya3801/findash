const Expense = require("../models/Expense")

exports.addExpense = async (req, res) => {
    try {
        const { title, amount, category, description, date } = req.body

        // Validations
        if (!title || !category || !date) {
            return res.status(400).json({ message: 'All fields are required!' })
        }
        if (amount <= 0 || !Number(amount)) {
            return res.status(400).json({ message: 'Amount must be a positive number!' })
        }

        const expense = Expense({
            user: req.user ? req.user._id : null, // Handle potential missing user safely initially
            title,
            amount,
            category,
            description,
            date
        })

        // Check if user exists after instantiation if strictly required
        if (!req.user) {
            console.error("Add Expense Error: User not found in request");
            return res.status(401).json({ message: 'User not authenticated' });
        }

        await expense.save()
        res.status(200).json({ message: 'Expense Added', expense })
        console.log(expense)
    } catch (error) {
        console.error("Add Expense Error:", error); // Log the actual error
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Validation Error', error: messages });
        }
        res.status(500).json({ message: 'Server Error', error: error.message })
    }
}

exports.getExpenses = async (req, res) => {
    try {
        // Use .lean() for faster queries (returns plain JS objects)
        const expenses = await Expense.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json(expenses);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
}

exports.updateExpense = async (req, res) => {
    const { id } = req.params;
    const { title, amount, category, description, date } = req.body;

    try {
        // Enforce ownership: only update the logged-in user's record
        const expense = await Expense.findOne({ _id: id, user: req.user._id });
        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        // Update fields
        if (title) expense.title = title;
        if (amount) expense.amount = amount;
        if (category) expense.category = category;
        if (description) expense.description = description;
        if (date) expense.date = date;

        await expense.save();
        res.status(200).json({ message: 'Expense Updated', expense });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
}

exports.deleteExpense = async (req, res) => {
    const { id } = req.params;
    try {
        // Enforce ownership: only delete the logged-in user's record
        const deleted = await Expense.findOneAndDelete({ _id: id, user: req.user._id });
        if (!deleted) {
            return res.status(404).json({ message: 'Expense not found' });
        }
        res.status(200).json({ message: 'Expense Deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
}
