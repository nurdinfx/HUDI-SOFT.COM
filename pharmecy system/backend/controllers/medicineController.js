const Medicine = require('../models/Medicine');

const getMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.find({ tenant: req.tenantId }).populate('category', 'name').populate('supplier', 'name');
    res.json(medicines);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createMedicine = async (req, res) => {
  try {
    const { name, barcode, category, supplier, buyingPrice, sellingPrice, expiryDate, batchNumber, lowStockThreshold } = req.body;
    
    if (barcode) {
      const existing = await Medicine.findOne({ tenant: req.tenantId, barcode });
      if (existing) return res.status(400).json({ message: 'Barcode already in use' });
    }

    const medicine = await Medicine.create({
      tenant: req.tenantId,
      name, barcode, category, supplier, buyingPrice, sellingPrice, expiryDate, batchNumber, lowStockThreshold
    });
    
    res.status(201).json(medicine);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add stock to a branch
const addStock = async (req, res) => {
  try {
    const { branchId, quantity } = req.body;
    const medicine = await Medicine.findOne({ _id: req.params.id, tenant: req.tenantId });

    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });

    const stockIndex = medicine.stock.findIndex(s => s.branch.toString() === branchId);
    
    if (stockIndex > -1) {
      medicine.stock[stockIndex].quantity += Number(quantity);
    } else {
      medicine.stock.push({ branch: branchId, quantity: Number(quantity) });
    }

    await medicine.save();
    res.json(medicine);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getMedicines, createMedicine, addStock };

