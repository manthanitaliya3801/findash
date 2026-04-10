const mongoose = require('mongoose');

const SavingGoalSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    targetAmount: {
        type: Number,
        required: true
    },
    currentAmount: {
        type: Number,
        default: 0
    },
    icon: {
        type: String,
        default: 'fa-solid fa-piggy-bank'
    },
    color: {
        type: String,
        default: '#5C9CE6'
    }
}, { timestamps: true });

module.exports = mongoose.model('SavingGoal', SavingGoalSchema);
