// MongoDB menu controller
import Product from '../models/Product.js';

// Get all menu items (using products table)
export const getMenuItems = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            search = '',
            category = '',
            available
        } = req.query;

        const branchId = req.user.branch._id || req.user.branch.id;

        const query = { branch: branchId };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        if (category) {
            query.category = category;
        }

        if (available !== undefined) {
            query.isAvailable = available === 'true';
        }

        // Get total count
        const total = await Product.countDocuments(query);

        // Apply sorting and pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const items = await Product.find(query)
            .sort({ category: 1, name: 1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.json({
            success: true,
            data: {
                menuItems: items.map(item => ({
                    ...item.toObject(),
                    _id: item._id.toString(),
                    id: item._id.toString(),
                    price: item.price,
                    isAvailable: !!item.isAvailable
                })),
                totalPages: Math.ceil(total / parseInt(limit)),
                currentPage: parseInt(page),
                total
            }
        });
    } catch (error) {
        console.error('Get menu items error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching menu items'
        });
    }
};

// Get menu item by ID
export const getMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const branchId = req.user.branch._id || req.user.branch.id;

        const item = await Product.findOne({ _id: id, branch: branchId });

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }

        res.json({
            success: true,
            data: {
                menuItem: {
                    ...item.toObject(),
                    _id: item._id.toString(),
                    id: item._id.toString(),
                    isAvailable: !!item.isAvailable
                }
            }
        });
    } catch (error) {
        console.error('Get menu item error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching menu item'
        });
    }
};

// Create menu item
export const createMenuItem = async (req, res) => {
    try {
        const { name, description, price, category, isAvailable, image } = req.body;
        const branchId = req.user.branch._id || req.user.branch.id;

        const item = await Product.create({
            name,
            description: description || '',
            price,
            category,
            isAvailable: isAvailable !== false,
            image: image || '',
            branch: branchId,
            active: true
        });

        res.status(201).json({
            success: true,
            message: 'Menu item created successfully',
            data: { 
              menuItem: { 
                ...item.toObject(), 
                _id: item._id.toString(),
                id: item._id.toString()
              } 
            }
        });
    } catch (error) {
        console.error('Create menu item error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating menu item'
        });
    }
};

// Update menu item
export const updateMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const branchId = req.user.branch._id || req.user.branch.id;

        const item = await Product.findOneAndUpdate(
            { _id: id, branch: branchId },
            { $set: updateData },
            { new: true }
        );

        if (!item) {
            return res.status(404).json({ success: false, message: 'Menu item not found' });
        }

        res.json({
            success: true,
            message: 'Menu item updated successfully',
            data: { 
              menuItem: { 
                ...item.toObject(), 
                _id: item._id.toString(),
                id: item._id.toString(),
                isAvailable: !!item.isAvailable 
              } 
            }
        });
    } catch (error) {
        console.error('Update menu item error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating menu item'
        });
    }
};

// Delete menu item
export const deleteMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const branchId = req.user.branch._id || req.user.branch.id;

        const item = await Product.findOneAndDelete({ _id: id, branch: branchId });

        if (!item) {
            return res.status(404).json({ success: false, message: 'Menu item not found' });
        }

        res.json({ success: true, message: 'Menu item deleted successfully' });
    } catch (error) {
        console.error('Delete menu item error:', error);
        res.status(500).json({ success: false, message: 'Server error deleting menu item' });
    }
};

// Deduct stock
export const deductStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity = 1 } = req.body;
        const branchId = req.user.branch._id || req.user.branch.id;

        const item = await Product.findOneAndUpdate(
            { _id: id, branch: branchId },
            { $inc: { stock: -quantity } },
            { new: true }
        );

        if (!item) {
            return res.status(404).json({ success: false, message: 'Menu item not found' });
        }

        res.json({ success: true, message: 'Stock deducted successfully' });

    } catch (error) {
        console.error('Deduct stock error:', error);
        res.status(500).json({ success: false, message: 'Server error deducting stock' });
    }
};

