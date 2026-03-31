// MongoDB user controller
import User from '../models/User.js';
import Branch from '../models/Branch.js';
import bcrypt from 'bcryptjs';

// Get all users
export const getUsers = async (req, res) => {
  try {
    const branchId = req.user.branch._id || req.user.branch.id;

    const users = await User.find({ branch: branchId }).populate('branch').sort({ name: 1 });

    res.json({
      success: true,
      data: users.map(u => ({
        ...u.toJSON(),
        id: u._id.toString(),
        _id: u._id.toString(),
        branch: u.branch ? {
          _id: u.branch._id.toString(),
          id: u.branch._id.toString(),
          name: u.branch.name,
          branchCode: u.branch.branchCode
        } : null
      }))
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

// Get single user
export const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch._id || req.user.branch.id;

    const user = await User.findOne({ _id: id, branch: branchId }).populate('branch');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        ...user.toJSON(),
        id: user._id.toString(),
        _id: user._id.toString(),
        branch: user.branch ? {
          _id: user.branch._id.toString(),
          id: user.branch._id.toString(),
          name: user.branch.name,
          branchCode: user.branch.branchCode
        } : null
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
};

// Create user
export const createUser = async (req, res) => {
  try {
    const { name, email, username, password, role } = req.body;
    const branchId = req.user.branch._id || req.user.branch.id;

    // Check existing
    const existing = await User.findOne({
      $or: [{ email }, { username }],
      branch: branchId
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    const user = await User.create({
      name,
      email,
      username,
      password, // User model hashes this
      role: role || 'staff',
      branch: branchId,
      isActive: true
    });

    const populatedUser = await User.findById(user._id).populate('branch');

    res.status(201).json({
      success: true,
      data: {
        ...populatedUser.toJSON(),
        id: populatedUser._id.toString(),
        _id: populatedUser._id.toString(),
        branch: populatedUser.branch ? {
          _id: populatedUser.branch._id.toString(),
          name: populatedUser.branch.name,
          branchCode: populatedUser.branch.branchCode
        } : null
      },
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const branchId = req.user.branch._id || req.user.branch.id;

    // Remove password from update data if it exists (use separate endpoint for pwd change)
    delete updateData.password;

    const user = await User.findOneAndUpdate(
      { _id: id, branch: branchId },
      { $set: updateData },
      { new: true }
    ).populate('branch');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        ...user.toJSON(),
        id: user._id.toString(),
        _id: user._id.toString(),
        branch: user.branch ? {
          _id: user.branch._id.toString(),
          name: user.branch.name,
          branchCode: user.branch.branchCode
        } : null
      },
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch._id || req.user.branch.id;

    const user = await User.findOneAndDelete({ _id: id, branch: branchId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
};

// Toggle user status
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch._id || req.user.branch.id;

    const user = await User.findOne({ _id: id, branch: branchId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    const populatedUser = await User.findById(id).populate('branch');

    res.json({
      success: true,
      data: {
        ...populatedUser.toJSON(),
        id: populatedUser._id.toString(),
        _id: populatedUser._id.toString(),
        branch: populatedUser.branch ? {
          _id: populatedUser.branch._id.toString(),
          name: populatedUser.branch.name,
          branchCode: populatedUser.branch.branchCode
        } : null
      },
      message: `User ${populatedUser.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle user status'
    });
  }
};

