const mongoose = require('mongoose');

const RECURRING_INTERVALS = ['none', 'daily', 'weekly', 'monthly', 'yearly'];

const ExpenseSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxLength: 50
    },
    amount: {
        type: Number,
        required: true,
        trim: true
    },
    type: {
        type: String,
        default: "expense"
    },
    date: {
        type: Date,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: false,
        maxLength: 100,
        trim: true
    },
    // Feature 1: Recurring Transactions
    isRecurring: { type: Boolean, default: false },
    recurringInterval: { type: String, enum: RECURRING_INTERVALS, default: 'none' },
    nextDueDate: { type: Date },
    // Feature 2: Tags & Notes
    tags: { type: [String], default: [] },
    notes: { type: String, maxLength: 500, trim: true }
}, { timestamps: true })

ExpenseSchema.index({ user: 1, date: -1 });
ExpenseSchema.index({ amount: 1 });

module.exports = mongoose.model('Expense', ExpenseSchema)
