const Income = require("../models/Income")

exports.addIncome = async (req, res) => {
    const { title, amount, category, description, date } = req.body

    const income = Income({
        user: req.user._id,
        title,
        amount,
        category,
        description,
        date
    })

    try {
        //validations
        if (!title || !category || !date) {
            return res.status(400).json({ message: 'All fields are required!' })
        }
        if (amount <= 0 || !Number(amount)) {
            return res.status(400).json({ message: 'Amount must be a positive number!' })
        }
        await income.save()
        res.status(200).json({ message: 'Income Added', income })
    } catch (error) {
        res.status(500).json({ message: 'Server Error' })
    }

    console.log(income)
}

exports.getIncomes = async (req, res) => {
    try {
        // Use .lean() for faster queries (returns plain JS objects)
        const incomes = await Income.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json(incomes);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
}

exports.updateIncome = async (req, res) => {
    const { id } = req.params;
    const { title, amount, category, description, date } = req.body;

    try {
        // Enforce ownership: only update the logged-in user's record
        const income = await Income.findOne({ _id: id, user: req.user._id });
        if (!income) {
            return res.status(404).json({ message: 'Income not found' });
        }

        // Update fields
        if (title) income.title = title;
        if (amount) income.amount = amount;
        if (category) income.category = category;
        if (description) income.description = description;
        if (date) income.date = date;

        await income.save();
        res.status(200).json({ message: 'Income Updated', income });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
}

exports.deleteIncome = async (req, res) => {
    const { id } = req.params;
    try {
        // Enforce ownership: only delete the logged-in user's record
        const deleted = await Income.findOneAndDelete({ _id: id, user: req.user._id });
        if (!deleted) {
            return res.status(404).json({ message: 'Income not found' });
        }
        res.status(200).json({ message: 'Income Deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
}
