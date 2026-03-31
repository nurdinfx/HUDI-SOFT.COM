// MongoDB table controller
import Table from '../models/Table.js';

// Helper to format table response
const formatTable = (table) => {
  if (!table) return null;
  const t = table.toObject ? table.toObject() : table;
  return {
    _id: t._id.toString(),
    id: t._id.toString(),
    number: t.number || t.tableNumber,
    tableNumber: t.tableNumber || t.number,
    name: t.name || `Table ${t.number || t.tableNumber}`,
    capacity: t.capacity || 4,
    location: t.location || 'indoor',
    status: t.status || 'available',
    branch: t.branch ? t.branch.toString() : null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt
  };
};

// Get all tables - MongoDB
export const getTables = async (req, res) => {
  try {
    const branchId = req.user.branch._id || req.user.branch.id;

    const tables = await Table.find({ branch: branchId }).sort({ number: 1 });

    res.json({
      success: true,
      data: tables.map(formatTable),
      count: tables.length
    });
  } catch (error) {
    console.error('Get tables error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tables'
    });
  }
};

// Get available tables - MongoDB
export const getAvailableTables = async (req, res) => {
  try {
    const branchId = req.user.branch._id || req.user.branch.id;

    const tables = await Table.find({ branch: branchId, status: 'available' }).sort({ number: 1 });

    res.json({
      success: true,
      data: tables.map(formatTable)
    });
  } catch (error) {
    console.error('Get available tables error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available tables'
    });
  }
};

// Get single table - MongoDB
export const getTable = async (req, res) => {
  try {
    const tableId = req.params.id;
    const branchId = req.user.branch._id || req.user.branch.id;

    const table = await Table.findOne({ _id: tableId, branch: branchId });

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }

    res.json({
      success: true,
      data: formatTable(table)
    });
  } catch (error) {
    console.error('Get table error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch table'
    });
  }
};

// Create table - MongoDB
export const createTable = async (req, res) => {
  try {
    const { tableNumber, name, capacity, location } = req.body;
    const branchId = req.user.branch._id || req.user.branch.id;

    // Check if table number already exists
    const existingTable = await Table.findOne({ number: tableNumber, branch: branchId });

    if (existingTable) {
      return res.status(400).json({
        success: false,
        message: 'Table number already exists'
      });
    }

    const table = await Table.create({
      number: tableNumber,
      tableNumber: tableNumber,
      name: name || `Table ${tableNumber}`,
      capacity: parseInt(capacity) || 4,
      location: location || 'indoor',
      status: 'available',
      branch: branchId
    });

    res.status(201).json({
      success: true,
      data: formatTable(table),
      message: 'Table created successfully'
    });
  } catch (error) {
    console.error('Create table error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create table'
    });
  }
};

// Update table - MongoDB
export const updateTable = async (req, res) => {
  try {
    const tableId = req.params.id;
    const branchId = req.user.branch._id || req.user.branch.id;
    const { tableNumber, name, capacity, location } = req.body;

    // Check if table number already exists (excluding current table)
    if (tableNumber) {
      const duplicate = await Table.findOne({
        number: tableNumber,
        branch: branchId,
        _id: { $ne: tableId }
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'Table number already exists'
        });
      }
    }

    const table = await Table.findOneAndUpdate(
      { _id: tableId, branch: branchId },
      { $set: { 
          number: tableNumber, 
          tableNumber: tableNumber,
          name, 
          capacity: capacity ? parseInt(capacity) : undefined, 
          location 
        } 
      },
      { new: true }
    );

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }

    res.json({
      success: true,
      data: formatTable(table),
      message: 'Table updated successfully'
    });
  } catch (error) {
    console.error('Update table error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update table'
    });
  }
};

// Update table status - MongoDB
export const updateTableStatus = async (req, res) => {
  try {
    const tableId = req.params.id;
    const branchId = req.user.branch._id || req.user.branch.id;
    const { status } = req.body;

    const table = await Table.findOneAndUpdate(
      { _id: tableId, branch: branchId },
      { $set: { status } },
      { new: true }
    );

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }

    res.json({
      success: true,
      data: formatTable(table),
      message: 'Table status updated successfully'
    });
  } catch (error) {
    console.error('Update table status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update table status'
    });
  }
};

// Delete table - MongoDB
export const deleteTable = async (req, res) => {
  try {
    const tableId = req.params.id;
    const branchId = req.user.branch._id || req.user.branch.id;

    const table = await Table.findOneAndDelete({ _id: tableId, branch: branchId });

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }

    res.json({
      success: true,
      message: 'Table deleted successfully'
    });
  } catch (error) {
    console.error('Delete table error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete table'
    });
  }
};

