import Order from '../models/Order.js';
import Expense from '../models/Expense.js';
import Purchase from '../models/Purchase.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Finance from '../models/Finance.js';
import CustomerLedger from '../models/CustomerLedger.js';
import Inventory from '../models/Inventory.js';
import Product from '../models/Product.js';

export const clearTransactionalData = async (req, res) => {
  try {
    const { confirm } = req.body;
    
    if (confirm !== 'CLEAR_ALL_DATA') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid confirmation string. Please provide "CLEAR_ALL_DATA" to proceed.' 
      });
    }

    // Step 1: Delete all transactional records
    const results = await Promise.allSettled([
      Order.deleteMany({}),
      Expense.deleteMany({}),
      Purchase.deleteMany({}),
      PurchaseOrder.deleteMany({}),
      Finance.deleteMany({}),
      CustomerLedger.deleteMany({}),
      Inventory.deleteMany({})
    ]);

    // Step 2: Reset stock for all products to 0
    await Product.updateMany({}, { $set: { stock: 0 } });

    console.log('✅ Transactional data cleared successfully by admin:', req.user?._id);

    res.json({ 
      success: true, 
      message: 'All transactional data (Orders, Expenses, Purchases, etc.) has been cleared. Product stock has been reset to zero.',
      details: results.map((r, i) => ({ 
        model: ['Order', 'Expense', 'Purchase', 'PurchaseOrder', 'Finance', 'CustomerLedger', 'Inventory'][i], 
        status: r.status 
      }))
    });
  } catch (error) {
    console.error('❌ Error clearing transactional data:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to clear transactional data', 
      error: error.message 
    });
  }
};
