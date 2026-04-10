const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxLength: 50
    },
    type: {
        type: String,
        required: true,
        enum: ['income', 'expense'],
        trim: true
    },
    icon: {
        type: String, // Optional: for future UI icons
        default: 'tag'
    },
    color: {
        type: String, // Optional: for UI colors
        default: '#cccccc'
    },
    budgetLimit: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Compound index to ensure unique category names per user per type
CategorySchema.index({ user: 1, name: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Category', CategorySchema);
