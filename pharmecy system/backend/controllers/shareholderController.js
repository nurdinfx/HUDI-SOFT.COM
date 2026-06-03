const Shareholder = require('../models/Shareholder');
const User = require('../models/User');
const mongoose = require('mongoose');

const getShareholders = async (req, res) => {
  try {
    const shareholders = await Shareholder.find({ tenant: req.tenantId }).populate('user', 'name email phone');
    res.json(shareholders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addShareholder = async (req, res) => {
  const { userId, percentageOwnership } = req.body;
  try {
    const user = await User.findOne({ _id: userId, tenant: req.tenantId });
    if (!user || user.role !== 'Shareholder') {
      return res.status(400).json({ message: 'User not found or not a shareholder role in your business' });
    }

    const existing = await Shareholder.findOne({ tenant: req.tenantId, user: userId });
    if (existing) {
      return res.status(400).json({ message: 'Shareholder already exists' });
    }

    const totalPercentage = await Shareholder.aggregate([
      { $match: { tenant: new mongoose.Types.ObjectId(req.tenantId) } },
      { $group: { _id: null, total: { $sum: "$percentageOwnership" } } }
    ]);
    const currentTotal = totalPercentage.length > 0 ? totalPercentage[0].total : 0;
    
    if (currentTotal + Number(percentageOwnership) > 100) {
      return res.status(400).json({ message: 'Total ownership cannot exceed 100%' });
    }

    const shareholder = await Shareholder.create({ 
      tenant: req.tenantId,
      user: userId, 
      percentageOwnership 
    });
    res.status(201).json(shareholder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getShareholders, addShareholder };

