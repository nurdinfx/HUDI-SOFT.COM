import Employee from '../models/Employee.js';
import EmployeeAdvance from '../models/EmployeeAdvance.js';
import mongoose from 'mongoose';

// Helper to format employee response
const formatEmployee = (employee) => {
  if (!employee) return null;
  const emp = employee.toObject ? employee.toObject() : employee;
  return {
    ...emp,
    _id: emp._id.toString(),
    id: emp._id.toString(),
    branch: emp.branch ? emp.branch.toString() : null
  };
};

// Helper to format advance response
const formatAdvance = (advance) => {
  if (!advance) return null;
  const adv = advance.toObject ? advance.toObject() : advance;
  return {
    ...adv,
    _id: adv._id.toString(),
    id: adv._id.toString(),
    employee: adv.employee ? (typeof adv.employee === 'object' ? {
      ...adv.employee,
      _id: adv.employee._id.toString(),
      id: adv.employee._id.toString()
    } : adv.employee.toString()) : null,
    branch: adv.branch ? adv.branch.toString() : null
  };
};

// Get all employees
export const getEmployees = async (req, res) => {
  try {
    const { search, status } = req.query;
    const branchId = req.user.branch._id || req.user.branch.id;

    const query = { branch: branchId };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const employees = await Employee.find(query).sort({ name: 1 });

    res.json({
      success: true,
      data: employees.map(formatEmployee)
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch employees' });
  }
};

// Get single employee details
export const getEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch._id || req.user.branch.id;

    const employee = await Employee.findOne({ _id: id, branch: branchId });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({
      success: true,
      data: formatEmployee(employee)
    });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch employee details' });
  }
};

// Create employee
export const createEmployee = async (req, res) => {
  try {
    const { name, position, phone, email, salary, status, joinDate } = req.body;
    const branchId = req.user.branch._id || req.user.branch.id;

    if (phone) {
      const existing = await Employee.findOne({ phone, branch: branchId });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Employee with this phone number already exists in this branch' });
      }
    }

    const employee = await Employee.create({
      name,
      position,
      phone,
      email,
      salary: parseFloat(salary),
      status: status || 'active',
      joinDate: joinDate || new Date(),
      branch: branchId
    });

    res.status(201).json({
      success: true,
      data: formatEmployee(employee),
      message: 'Employee created successfully'
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ success: false, message: 'Failed to create employee' });
  }
};

// Update employee
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, position, phone, email, salary, status, joinDate } = req.body;
    const branchId = req.user.branch._id || req.user.branch.id;

    if (phone) {
      const existing = await Employee.findOne({ phone, branch: branchId, _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Another employee with this phone number already exists' });
      }
    }

    const employee = await Employee.findOneAndUpdate(
      { _id: id, branch: branchId },
      { 
        $set: { 
          name, 
          position, 
          phone, 
          email, 
          salary: parseFloat(salary), 
          status, 
          joinDate 
        } 
      },
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({
      success: true,
      data: formatEmployee(employee),
      message: 'Employee updated successfully'
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ success: false, message: 'Failed to update employee' });
  }
};

// Delete employee
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch._id || req.user.branch.id;

    // Delete related advances
    await EmployeeAdvance.deleteMany({ employee: id, branch: branchId });

    const employee = await Employee.findOneAndDelete({ _id: id, branch: branchId });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({ success: true, message: 'Employee and related records deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete employee' });
  }
};

// Get all advances
export const getAdvances = async (req, res) => {
  try {
    const { employeeId, status } = req.query;
    const branchId = req.user.branch._id || req.user.branch.id;

    const query = { branch: branchId };

    if (status) {
      query.status = status;
    }

    if (employeeId) {
      query.employee = employeeId;
    }

    const advances = await EmployeeAdvance.find(query)
      .populate('employee', 'name position')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: advances.map(formatAdvance)
    });
  } catch (error) {
    console.error('Get advances error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch advances' });
  }
};

// Create advance
export const createAdvance = async (req, res) => {
  try {
    const { employeeId, amount, description, date } = req.body;
    const branchId = req.user.branch._id || req.user.branch.id;

    const employee = await Employee.findOne({ _id: employeeId, branch: branchId });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const advance = await EmployeeAdvance.create({
      employee: employeeId,
      amount: parseFloat(amount),
      description,
      date: date || new Date(),
      status: 'pending',
      branch: branchId
    });

    // Populate employee details for UI responsiveness
    const populated = await EmployeeAdvance.findById(advance._id).populate('employee', 'name position');

    res.status(201).json({
      success: true,
      data: formatAdvance(populated),
      message: 'Advance recorded successfully'
    });
  } catch (error) {
    console.error('Create advance error:', error);
    res.status(500).json({ success: false, message: 'Failed to record advance' });
  }
};

// Update advance status
export const updateAdvanceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const branchId = req.user.branch._id || req.user.branch.id;

    const validStatuses = ['pending', 'deducted', 'paid'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const advance = await EmployeeAdvance.findOneAndUpdate(
      { _id: id, branch: branchId },
      { $set: { status } },
      { new: true }
    ).populate('employee', 'name position');

    if (!advance) {
      return res.status(404).json({ success: false, message: 'Advance record not found' });
    }

    res.json({
      success: true,
      data: formatAdvance(advance),
      message: `Advance marked as ${status}`
    });
  } catch (error) {
    console.error('Update advance status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update advance status' });
  }
};

// Delete advance
export const deleteAdvance = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch._id || req.user.branch.id;

    const advance = await EmployeeAdvance.findOneAndDelete({ _id: id, branch: branchId });
    if (!advance) {
      return res.status(404).json({ success: false, message: 'Advance record not found' });
    }

    res.json({ success: true, message: 'Advance record deleted successfully' });
  } catch (error) {
    console.error('Delete advance error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete advance' });
  }
};

// Get employee summary statistics
export const getEmployeeSummary = async (req, res) => {
  try {
    const branchId = req.user.branch._id || req.user.branch.id;

    const totalEmployees = await Employee.countDocuments({ branch: branchId });
    const activeEmployees = await Employee.countDocuments({ branch: branchId, status: 'active' });

    // Sum of salaries of active employees
    const payrollAggregation = await Employee.aggregate([
      { $match: { branch: new mongoose.Types.ObjectId(branchId), status: 'active' } },
      { $group: { _id: null, totalPayroll: { $sum: "$salary" } } }
    ]);
    const totalPayroll = payrollAggregation.length > 0 ? payrollAggregation[0].totalPayroll : 0;

    // Sum of outstanding (pending status) advances
    const advancesAggregation = await EmployeeAdvance.aggregate([
      { $match: { branch: new mongoose.Types.ObjectId(branchId), status: 'pending' } },
      { $group: { _id: null, totalOutstanding: { $sum: "$amount" } } }
    ]);
    const totalOutstandingAdvances = advancesAggregation.length > 0 ? advancesAggregation[0].totalOutstanding : 0;

    res.json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        totalPayroll,
        totalOutstandingAdvances
      }
    });
  } catch (error) {
    console.error('Get employee summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch employee summary' });
  }
};
