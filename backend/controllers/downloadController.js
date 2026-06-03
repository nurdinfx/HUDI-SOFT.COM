const License = require('../models/License');
const path = require('path');
const fs = require('fs');

// @desc    Download POS or HMS system
// @route   GET /api/downloads/:productType
// @access  Private (Authenticated Users with Active License)
const downloadSystem = async (req, res) => {
    const { productType } = req.params;
    const userId = req.user._id;

    if (!['POS', 'POS_OFFLINE', 'POS_ONLINE', 'HMS', 'DETAIL_CARE'].includes(productType)) {
        return res.status(400).json({ message: 'Invalid product type' });
    }

    console.log(`[Download] Private request for ${productType} from user ${userId}`);

    try {
        // Check if user has an active license for this product
        const license = await License.findOne({
            userId: userId,
            productType: productType,
            status: 'Active',
            expiryDate: { $gt: new Date() }
        });

        if (!license) {
            console.warn(`[Download] Access Denied: No active license for ${productType}`);
            return res.status(403).json({
                message: `No active license found for ${productType}. Please ensure your payment is verified.`
            });
        }

        // Use the actual .exe installer name from the build process
        const fileName = productType === 'POS_ONLINE' ? 'Hudi-Soft-POS-Online-Setup.exe' : (productType === 'POS_OFFLINE' || productType === 'POS') ? 'Hudi-Soft-POS-Setup.exe' : productType === 'DETAIL_CARE' ? 'Detail-Care-PWA-Setup.exe' : 'Hudi-Soft-HMS-Setup.exe';
        const filePath = path.join(__dirname, '../downloads', fileName);

        // Ensure the downloads directory exists
        const downloadsDir = path.join(__dirname, '../downloads');
        if (!fs.existsSync(downloadsDir)) {
            fs.mkdirSync(downloadsDir, { recursive: true });
        }

        if (!fs.existsSync(filePath)) {
            console.error(`[Download Error] File NOT found at path: ${filePath}`);
            console.log(`[Download Info] Available files in downloads: ${fs.readdirSync(path.join(__dirname, '../downloads')).join(', ')}`);
            return res.status(404).json({ 
                message: 'The installer file is currently being updated or is temporarily unavailable. Our team has been notified.' 
            });
        }

        console.log(`[Download Success] Serving: ${fileName} (${(fs.statSync(filePath).size / (1024 * 1024)).toFixed(2)} MB)`);
        res.download(filePath, fileName, (err) => {
            if (err && !res.headersSent) {
                console.error(`[Download Error] Failed to stream ${fileName}:`, err);
                res.status(500).json({ message: 'Could not complete the download. Please try again later.' });
            }
        });

    } catch (error) {
        console.error('[Download] Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Download Demo POS or HMS system (Public)
// @route   GET /api/downloads/demo/:productType
// @access  Public
const downloadDemo = async (req, res) => {
    const { productType } = req.params;

    if (!['POS', 'POS_OFFLINE', 'POS_ONLINE', 'HMS', 'DETAIL_CARE'].includes(productType)) {
        return res.status(400).json({ message: 'Invalid product type' });
    }

    console.log(`[Download Demo] Public request for ${productType}`);

    try {
        const fileName = productType === 'POS_ONLINE' ? 'Hudi-Soft-POS-Online-Setup.exe' : (productType === 'POS_OFFLINE' || productType === 'POS') ? 'Hudi-Soft-POS-Setup.exe' : productType === 'DETAIL_CARE' ? 'Detail-Care-PWA-Setup.exe' : 'Hudi-Soft-HMS-Setup.exe';
        const filePath = path.join(__dirname, '../downloads', fileName);
        
        if (!fs.existsSync(filePath)) {
            console.error(`[Download Demo Error] Demo file NOT found: ${filePath}`);
            console.log(`[Download Info] Available files in downloads: ${fs.readdirSync(path.join(__dirname, '../downloads')).join(', ')}`);
            return res.status(404).json({ message: 'The demo installer is currently being updated. Please try again in a few minutes.' });
        }

        console.log(`[Download Demo Success] Serving Demo: ${fileName} (${(fs.statSync(filePath).size / (1024 * 1024)).toFixed(2)} MB)`);
        res.download(filePath, fileName, (err) => {
            if (err && !res.headersSent) {
                console.error(`[Download Demo Error] Failed to stream demo ${fileName}:`, err);
                res.status(500).json({ message: 'Could not complete the demo download.' });
            }
        });

    } catch (error) {
        console.error('[Download Demo] Error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { downloadSystem, downloadDemo };
