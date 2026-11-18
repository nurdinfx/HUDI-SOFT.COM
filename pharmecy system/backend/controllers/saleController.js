const Sale = require('../models/Sale');
const Medicine = require('../models/Medicine');

// @desc    Create a new sale
// @route   POST /api/v1/sales
// @access  Private
const createSale = async (req, res) => {
  const { branch, items, paymentMethod, customerName, customerPhone, discount = 0, vatPercentage = 0 } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ message: 'No items provided' });
  }

  try {
    let subTotal = 0;
    const saleItems = [];

    // Verify stock and calculate total
    for (const item of items) {
      const medicine = await Medicine.findOne({ _id: item.medicine, tenant: req.tenantId });
      if (!medicine) return res.status(404).json({ message: `Medicine ${item.medicine} not found` });

      const stockIndex = medicine.stock.findIndex(s => s.branch.toString() === branch);
      if (stockIndex === -1 || medicine.stock[stockIndex].quantity < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${medicine.name}` });
      }

      const itemTotal = medicine.sellingPrice * item.quantity;
      subTotal += itemTotal;

      saleItems.push({
        medicine: medicine._id,
        quantity: item.quantity,
        price: medicine.sellingPrice,
        total: itemTotal
      });

      // Deduct stock
      medicine.stock[stockIndex].quantity -= item.quantity;
      await medicine.save();
    }

    const vatAmount = subTotal * (vatPercentage / 100);
    const grandTotal = subTotal + vatAmount - discount;

    const receiptNumber = 'REC-' + Date.now().toString().slice(-6);

    const sale = await Sale.create({
      tenant: req.tenantId,
      branch,
      cashier: req.user._id,
      items: saleItems,
      subTotal,
      vatAmount,
      discount,
      grandTotal,
      paymentMethod,
      receiptNumber,
      customerName,
      customerPhone
    });

    res.status(201).json(sale);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get sales
// @route   GET /api/v1/sales
// @access  Private
const getSales = async (req, res) => {
  try {
    let filter = { tenant: req.tenantId };
    if (req.user.role === 'Branch Manager' || req.user.role === 'Cashier') {
      filter.branch = req.user.branch;
    }
    
    const sales = await Sale.find(filter)
      .populate('cashier', 'name')
      .populate('items.medicine', 'name')
      .sort('-createdAt');
      
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createSale, getSales };

