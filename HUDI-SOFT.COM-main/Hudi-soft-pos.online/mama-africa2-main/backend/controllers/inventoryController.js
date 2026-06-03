// MongoDB inventory controller
import Product from '../models/Product.js';
import Inventory from '../models/Inventory.js';
import mongoose from 'mongoose';

// Get all inventory items - MongoDB
export const getInventory = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            search = '',
            category = '',
            lowStock = false
        } = req.query;

        const branchId = req.user.branch._id || req.user.branch.id;

        const query = { branch: branchId };

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        if (category) {
            query.category = category;
        }

        if (lowStock === 'true') {
            // Using $where is usually not efficient, but for this scale it's fine 
            // OR we can use aggregation or expr
            query.$expr = { $lte: ["$stock", "$minStock"] };
        }

        const total = await Product.countDocuments(query);
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const inventory = await Product.find(query)
            .sort({ name: 1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.json({
            success: true,
            data: {
                inventory: inventory.map(item => {
                    const i = item.toObject();
                    return {
                        ...i,
                        _id: i._id.toString(),
                        id: i._id.toString(),
                        currentStock: i.stock,
                        isLowStock: i.stock <= i.minStock
                    };
                }),
                totalPages: Math.ceil(total / parseInt(limit)),
                currentPage: parseInt(page),
                total
            }
        });
    } catch (error) {
        console.error('Get inventory error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching inventory'
        });
    }
};

// Get low stock items - MongoDB
export const getLowStockItems = async (req, res) => {
    try {
        const branchId = req.user.branch._id || req.user.branch.id;

        const lowStockItems = await Product.find({
            branch: branchId,
            $expr: { $lte: ["$stock", "$minStock"] }
        }).sort({ stock: 1 });

        res.json({
            success: true,
            data: {
                lowStockItems: lowStockItems.map(item => {
                    const i = item.toObject();
                    return {
                        ...i,
                        _id: i._id.toString(),
                        id: i._id.toString(),
                        currentStock: i.stock,
                        isLowStock: true
                    };
                })
            }
        });
    } catch (error) {
        console.error('Get low stock error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching low stock items'
        });
    }
};

// Get inventory item by ID - MongoDB
export const getInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const branchId = req.user.branch._id || req.user.branch.id;

        const item = await Product.findOne({ _id: id, branch: branchId });

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Inventory item not found'
            });
        }

        const i = item.toObject();
        res.json({
            success: true,
            data: {
                inventoryItem: {
                    ...i,
                    _id: i._id.toString(),
                    id: i._id.toString(),
                    currentStock: i.stock,
                    isLowStock: i.stock <= i.minStock
                }
            }
        });
    } catch (error) {
        console.error('Get inventory item error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching inventory item'
        });
    }
};

// Create inventory item - MongoDB
export const createInventoryItem = async (req, res) => {
    try {
        const { name, category, currentStock, minStock, costPerUnit } = req.body;
        const branchId = req.user.branch._id || req.user.branch.id;

        const item = await Product.create({
            name,
            category,
            stock: currentStock || 0,
            minStock: minStock || 10,
            cost: costPerUnit || 0,
            branch: branchId,
            active: true,
            isAvailable: true
        });

        const i = item.toObject();
        res.status(201).json({
            success: true,
            message: 'Inventory item created successfully',
            data: {
                inventoryItem: {
                    ...i,
                    _id: i._id.toString(),
                    id: i._id.toString(),
                    currentStock: i.stock
                }
            }
        });
    } catch (error) {
        console.error('Create inventory error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating inventory item'
        });
    }
};

// Update inventory item - MongoDB
export const updateInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, currentStock, minStock, costPerUnit } = req.body;
        const branchId = req.user.branch._id || req.user.branch.id;

        const item = await Product.findOneAndUpdate(
            { _id: id, branch: branchId },
            { 
               $set: {
                 name,
                 category,
                 stock: currentStock,
                 minStock,
                 cost: costPerUnit
               }
            },
            { new: true }
        );

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Inventory item not found'
            });
        }

        const i = item.toObject();
        res.json({
            success: true,
            message: 'Inventory item updated successfully',
            data: {
                inventoryItem: {
                    ...i,
                    _id: i._id.toString(),
                    id: i._id.toString(),
                    currentStock: i.stock
                }
            }
        });
    } catch (error) {
        console.error('Update inventory error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating inventory item'
        });
    }
};

// Delete inventory item - MongoDB
export const deleteInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const branchId = req.user.branch._id || req.user.branch.id;

        const item = await Product.findOneAndDelete({ _id: id, branch: branchId });

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Inventory item not found'
            });
        }

        res.json({
            success: true,
            message: 'Inventory item deleted successfully'
        });
    } catch (error) {
        console.error('Delete inventory error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting inventory item'
        });
    }
};

// Restock inventory - MongoDB
export const restockInventory = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const { quantity, cost, reason = 'Restock' } = req.body;
        const branchId = req.user.branch._id || req.user.branch.id;

        const updateData = { $inc: { stock: parseInt(quantity) } };
        if (cost) {
            updateData.$set = { cost: parseFloat(cost) };
        }

        const item = await Product.findOneAndUpdate(
            { _id: id, branch: branchId },
            updateData,
            { new: true, session }
        );

        if (!item) {
            throw new Error('Inventory item not found');
        }

        // Log movement in inventory
        await Inventory.create([{
            product: id,
            type: 'in',
            quantity: parseInt(quantity),
            reason: reason,
            branch: branchId,
            createdBy: req.user.id
        }], { session });

        await session.commitTransaction();
        session.endSession();

        const i = item.toObject();
        res.json({
            success: true,
            message: 'Inventory restocked successfully',
            data: {
                inventoryItem: {
                    ...i,
                    _id: i._id.toString(),
                    id: i._id.toString(),
                    currentStock: i.stock
                }
            }
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Restock inventory error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error restocking inventory'
        });
    }
};

