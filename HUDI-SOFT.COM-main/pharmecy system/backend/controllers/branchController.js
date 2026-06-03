const Branch = require('../models/Branch');

// @desc    Get all branches
// @route   GET /api/v1/branches
// @access  Private (Owner, Manager)
const getBranches = async (req, res) => {
  try {
    const branches = await Branch.find({ tenant: req.tenantId }).populate('manager', 'name email');
    res.json(branches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a branch
// @route   POST /api/v1/branches
// @access  Private (Owner)
const createBranch = async (req, res) => {
  const { name, address, phone, manager } = req.body;

  try {
    const branchExists = await Branch.findOne({ tenant: req.tenantId, name });
    if (branchExists) {
      return res.status(400).json({ message: 'Branch already exists in your business' });
    }

    const branch = await Branch.create({ 
      tenant: req.tenantId, 
      name, 
      address, 
      phone, 
      manager 
    });
    res.status(201).json(branch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a branch
// @route   PUT /api/v1/branches/:id
// @access  Private (Owner)
const updateBranch = async (req, res) => {
  try {
    const branch = await Branch.findOne({ _id: req.params.id, tenant: req.tenantId });

    if (branch) {
      branch.name = req.body.name || branch.name;
      branch.address = req.body.address || branch.address;
      branch.phone = req.body.phone || branch.phone;
      branch.manager = req.body.manager || branch.manager;
      branch.isActive = req.body.isActive !== undefined ? req.body.isActive : branch.isActive;

      const updatedBranch = await branch.save();
      res.json(updatedBranch);
    } else {
      res.status(404).json({ message: 'Branch not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a branch
// @route   DELETE /api/v1/branches/:id
// @access  Private (Owner)
const deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findOne({ _id: req.params.id, tenant: req.tenantId });

    if (branch) {
      await branch.deleteOne();
      res.json({ message: 'Branch removed' });
    } else {
      res.status(404).json({ message: 'Branch not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getBranches, createBranch, updateBranch, deleteBranch };

