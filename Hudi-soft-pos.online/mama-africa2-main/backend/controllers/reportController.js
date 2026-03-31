// MongoDB report controller
import Purchase from '../models/Purchase.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

// Get purchase reports - MongoDB
export const getPurchaseReports = async (req, res) => {
  try {
    const {
      from,
      to,
      supplierId,
      groupBy = 'day'
    } = req.query;

    const branchId = req.user.branch._id || req.user.branch.id;

    const matchQuery = { branch: new mongoose.Types.ObjectId(branchId) };

    if (from || to) {
      matchQuery.createdAt = {};
      if (from) matchQuery.createdAt.$gte = new Date(from);
      if (to) matchQuery.createdAt.$lte = new Date(to);
    }

    if (supplierId) {
      matchQuery.supplierId = new mongoose.Types.ObjectId(supplierId);
    }

    // Aggregation Logic
    let groupById;
    if (groupBy === 'supplier') {
      groupById = '$supplierId';
    } else if (groupBy === 'month') {
      groupById = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
    } else {
      groupById = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
    }

    const reports = await Purchase.aggregate([
      { $match: matchQuery },
      { $unwind: "$items" },
      {
        $group: {
          _id: groupById,
          totalPurchases: { $addToSet: "$_id" },
          totalAmount: { $sum: "$grandTotal" }, // This might double count if grouping with unwind. Need adjustment.
          totalQuantity: { $sum: "$items.qty" }
        }
      },
      {
        $project: {
          groupId: "$_id",
          totalPurchases: { $size: "$totalPurchases" },
          totalAmount: 1, // Actually sum of grandTotal is tricky with unwind, let's fix
          totalQuantity: 1
        }
      },
      { $sort: { groupId: 1 } }
    ]);

    // Correct sum for totalAmount (group by purchase first then by report group)
    const correctedReports = await Purchase.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: groupById,
            totalPurchases: { $sum: 1 },
            totalAmount: { $sum: "$grandTotal" }
          }
        },
        { $sort: { _id: 1 } }
    ]);

    // Top Products Query
    const topProducts = await Purchase.aggregate([
        { $match: matchQuery },
        { $unwind: "$items" },
        {
            $group: {
                _id: "$items.product",
                productName: { $first: "$items.productName" },
                totalQuantity: { $sum: "$items.qty" },
                totalAmount: { $sum: "$items.total" },
                averageCost: { $avg: "$items.unitCost" }
            }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        reports: correctedReports.map(r => ({ ...r, groupId: r._id })),
        topProducts,
        summary: {
          totalReports: correctedReports.length,
          totalProducts: topProducts.length
        }
      }
    });

  } catch (error) {
    console.error('Purchase reports error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get inventory report - MongoDB
export const getInventoryReport = async (req, res) => {
  try {
    const { lowStock = false } = req.query;
    const branchId = req.user.branch._id || req.user.branch.id;

    const query = { branch: branchId };

    if (lowStock === 'true') {
      // In MongoDB, comparing two fields requires $expr
      query.$expr = { $lte: ["$stock", "$minStock"] };
    }

    const productsResult = await Product.find(query).sort({ stock: 1 });

    // Calculate summary statistics
    const stats = await Product.aggregate([
        { $match: { branch: new mongoose.Types.ObjectId(branchId) } },
        {
            $group: {
                _id: null,
                totalProducts: { $sum: 1 },
                totalValue: { $sum: { $multiply: ["$stock", { $ifNull: ["$cost", 0] }] } },
                lowStockCount: {
                    $sum: {
                        $cond: [{ $lte: ["$stock", "$minStock"] }, 1, 0]
                    }
                }
            }
        }
    ]);

    const summary = stats.length > 0 ? stats[0] : {
        totalProducts: 0,
        totalValue: 0,
        lowStockCount: 0
    };

    res.json({
      success: true,
      data: {
        products: productsResult.map(p => ({
          ...p.toObject(),
          _id: p._id.toString(),
          id: p._id.toString(),
          costPrice: p.cost
        })),
        summary: {
          totalProducts: summary.totalProducts,
          totalValue: summary.totalValue,
          lowStockItems: summary.lowStockCount
        }
      }
    });
  } catch (error) {
    console.error('Inventory report error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};