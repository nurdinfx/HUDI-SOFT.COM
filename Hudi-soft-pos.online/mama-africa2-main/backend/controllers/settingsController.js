// MongoDB settings controller
import Branch from '../models/Branch.js';
import Setting from '../models/Settings.js';
import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';

// Get branch settings - MongoDB
export const getBranchSettings = async (req, res) => {
  try {
    const { branchId } = req.params;

    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.branch._id.toString() !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Get settings for this branch
    let settings = await Setting.findOne({ branch: branchId });

    const response = {
      branch: { ...branch.toObject(), _id: branch._id.toString(), id: branch._id.toString() },
      settings: settings ? settings.toObject() : {}
    };

    res.json({ success: true, data: response });
  } catch (error) {
    console.error('Get branch settings error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update branch settings - MongoDB
export const updateBranchSettings = async (req, res) => {
  try {
    const { branchId } = req.params;
    const updateData = req.body;

    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.branch._id.toString() !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Update branch information
    if (updateData.branch) {
      const bData = updateData.branch;
      await Branch.findByIdAndUpdate(branchId, {
        $set: {
          name: bData.name,
          address: bData.address,
          phone: bData.phone,
          email: bData.email
        }
      });
    }

    // Update settings
    if (updateData.settings) {
      await Setting.findOneAndUpdate(
        { branch: branchId },
        { $set: updateData.settings },
        { upsert: true, new: true }
      );
    }

    const updatedBranch = await Branch.findById(branchId);
    const finalSettings = await Setting.findOne({ branch: branchId });

    const response = {
      branch: { ...updatedBranch.toObject(), _id: updatedBranch._id.toString(), id: updatedBranch._id.toString() },
      settings: finalSettings ? finalSettings.toObject() : {}
    };

    res.json({ success: true, data: response, message: 'Branch settings updated successfully' });
  } catch (error) {
    console.error('Update branch settings error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get settings - MongoDB
export const getSettings = async (req, res) => {
  try {
    const branchId = req.user.role === 'admin' ?
      (req.query.branchId || req.user.branch?._id || req.user.branch) :
      (req.user.branch?._id || req.user.branch);

    let settings = await Setting.findOne({ branch: branchId });

    if (!settings) {
      // Create default settings for this branch if they don't exist
      settings = await Setting.create({ branch: branchId });
    }

    res.json({ success: true, data: settings.toObject() });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update settings - MongoDB
export const updateSettings = async (req, res) => {
  try {
    const updateData = req.body;
    const branchId = req.user.role === 'admin' ?
      (req.body.branchId || req.user.branch?._id || req.user.branch) :
      (req.user.branch?._id || req.user.branch);

    // Filter out branchId if it's in updateData to avoid changing branch ownership
    const { branchId: _, ...cleanData } = updateData;

    const settings = await Setting.findOneAndUpdate(
      { branch: branchId },
      { $set: cleanData },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: settings.toObject(), message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Upload logo - MongoDB
export const uploadLogo = async (req, res) => {
  try {
    const { branchId } = req.params;
    
    if (!req.file && !(req.files && req.files.logo)) {
      return res.status(400).json({ success: false, message: 'No logo file uploaded' });
    }

    const fileToUpload = req.file || (req.files && req.files.logo);
    let logoUrl = '';

    // Check if Cloudinary is enabled
    const cloudinaryEnabled = Boolean(
      process.env.CLOUDINARY_URL ||
      (process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET)
    );

    if (cloudinaryEnabled) {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(fileToUpload.path || fileToUpload.tempFilePath, {
        folder: `rms/restaurants/${branchId}`,
        width: 300,
        height: 300,
        crop: 'limit'
      });
      logoUrl = result.secure_url;
    } else {
      // Fallback to local storage
      const fileName = fileToUpload.filename || (fileToUpload.name ? `${Date.now()}-${fileToUpload.name}` : `logo-${Date.now()}.png`);
      logoUrl = `${req.protocol}://${req.get('host')}/uploads/${fileName}`;
    }

    // Update branch with logo URL
    const branch = await Branch.findByIdAndUpdate(
      branchId, 
      { logo: logoUrl }, 
      { new: true }
    );

    // Also update settings with logo URL
    await Setting.findOneAndUpdate(
      { branch: branchId },
      { $set: { logoUrl: logoUrl } },
      { upsert: true }
    );

    res.json({ 
      success: true, 
      data: { 
        logo: logoUrl, 
        branch: branch ? { ...branch.toObject(), _id: branch._id.toString(), id: branch._id.toString() } : null
      }, 
      message: 'Logo uploaded successfully' 
    });
  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get system settings - Static
export const getSystemSettings = async (req, res) => {
  try {
    const systemSettings = {
      appName: 'Mama Africa Restaurant',
      version: '1.0.0',
      maxBranches: 5,
      features: {
        inventory: true,
        multiBranch: true,
        onlineOrders: false
      }
    };

    res.json({ success: true, data: systemSettings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
