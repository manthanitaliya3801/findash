const Category = require('../models/Category');

exports.addCategory = async (req, res) => {
    const { name, type, icon, color } = req.body;

    // Validation
    if (!name || !type) {
        return res.status(400).json({ message: 'Name and type are required' });
    }

    if (type !== 'income' && type !== 'expense') {
        return res.status(400).json({ message: 'Type must be income or expense' });
    }

    try {
        const category = new Category({
            user: req.user.id,
            name,
            type,
            icon,
            color
        });

        await category.save();
        res.status(200).json({ message: 'Category added', category });
    } catch (error) {
        // Handle unique constraint violation
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Category already exists' });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getCategories = async (req, res) => {
    const { type } = req.query; // Optional filter by type

    try {
        const query = { user: req.user.id };
        if (type) {
            query.type = type;
        }

        const categories = await Category.find(query).sort({ createdAt: -1 });
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.deleteCategory = async (req, res) => {
    const { id } = req.params;
    Category.findByIdAndDelete(id)
        .then((category) => {
            if (!category) {
                return res.status(404).json({ message: 'Category not found' });
            }
            res.status(200).json({ message: 'Category Deleted' });
        })
        .catch((err) => {
            res.status(500).json({ message: 'Server Error', error: err.message });
        });
}

exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, icon, color, budgetLimit } = req.body;
        const category = await Category.findByIdAndUpdate(id, {
            name, type, icon, color, budgetLimit
        }, { new: true });

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.status(200).json({ message: 'Category Updated', category });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
