const License = require('../models/License');
const path = require('path');
const fs = require('fs');

// @desc    Download POS or HMS system
// @route   GET /api/downloads/:productType
// @access  Private (Authenticated Users with Active License)
const downloadSystem = async (req, res) => {
    const { productType } = req.params;
    const userId = req.user._id;

    if (!['POS', 'HMS'].includes(productType)) {
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
        const fileName = productType === 'POS' ? 'Hudi-Soft-POS-Setup.exe' : 'Hudi-Soft-HMS-Setup.exe';
        const filePath = path.join(__dirname, '../downloads', fileName);

        // Ensure the downloads directory exists
        const downloadsDir = path.join(__dirname, '../downloads');
        if (!fs.existsSync(downloadsDir)) {
            fs.mkdirSync(downloadsDir, { recursive: true });
        }

        if (!fs.existsSync(filePath)) {
            console.warn(`[Download] File not found: ${filePath}. Serving placeholder.`);
            // In production, we should probably return a 404 if the real file is missing
            return res.status(404).json({ message: 'The installer file is currently being updated. Please try again in 5 minutes.' });
        }

        console.log(`[Download] Serving: ${fileName}`);
        res.download(filePath, fileName, (err) => {
            if (err && !res.headersSent) {
                console.error(`[Download] Error sending ${fileName}:`, err);
                res.status(500).json({ message: 'Could not download the file.' });
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

    if (!['POS', 'HMS'].includes(productType)) {
        return res.status(400).json({ message: 'Invalid product type' });
    }

    console.log(`[Download Demo] Public request for ${productType}`);

    try {
        const fileName = productType === 'POS' ? 'Hudi-Soft-POS-Setup.exe' : 'Hudi-Soft-HMS-Setup.exe';
        const filePath = path.join(__dirname, '../downloads', fileName);
        
        if (!fs.existsSync(filePath)) {
            console.warn(`[Download Demo] File not found: ${filePath}.`);
            return res.status(404).json({ message: 'The demo installer is currently unavailable.' });
        }

        console.log(`[Download Demo] Serving: ${fileName}`);
        res.download(filePath, fileName, (err) => {
            if (err && !res.headersSent) {
                console.error(`[Download Demo] Error sending ${fileName}:`, err);
                res.status(500).json({ message: 'Could not download the file.' });
            }
        });

    } catch (error) {
        console.error('[Download Demo] Error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { downloadSystem, downloadDemo };
