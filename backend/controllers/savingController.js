const SavingGoal = require('../models/SavingGoal');

exports.addGoal = async (req, res) => {
    try {
        const { title, targetAmount, currentAmount, icon, color } = req.body;
        const savingGoal = new SavingGoal({
            user: req.user.id,
            title,
            targetAmount,
            currentAmount,
            icon,
            color
        });
        await savingGoal.save();
        res.status(200).json({ message: 'Saving Goal Added', savingGoal });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

exports.getGoals = async (req, res) => {
    try {
        const goals = await SavingGoal.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json(goals);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.updateGoal = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, targetAmount, currentAmount, icon, color } = req.body;
        // Enforce ownership — only allow updating the logged-in user's goal
        const savingGoal = await SavingGoal.findOneAndUpdate(
            { _id: id, user: req.user.id },
            { title, targetAmount, currentAmount, icon, color },
            { new: true }
        );
        if (!savingGoal) {
            return res.status(404).json({ message: 'Saving Goal not found' });
        }
        res.status(200).json({ message: 'Saving Goal Updated', savingGoal });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.deleteGoal = async (req, res) => {
    try {
        const { id } = req.params;
        // Enforce ownership — only allow deleting the logged-in user's goal
        const deleted = await SavingGoal.findOneAndDelete({ _id: id, user: req.user.id });
        if (!deleted) {
            return res.status(404).json({ message: 'Saving Goal not found' });
        }
        res.status(200).json({ message: 'Saving Goal Deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
