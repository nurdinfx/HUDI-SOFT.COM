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

    try {
        // Check if user has an active license for this product
        const license = await License.findOne({
            userId: userId,
            productType: productType,
            status: 'Active',
            expiryDate: { $gt: new Date() }
        });

        if (!license) {
            return res.status(403).json({
                message: `No active license found for ${productType}. Please ensure your payment is verified.`
            });
        }

        // Define file paths (using placeholders for now)
        // In a real scenario, these would be the paths to the actual PWA/Desktop installers
        const fileName = productType === 'POS' ? 'hudi-pos-v1.zip' : 'hudi-hms-v1.zip';
        const filePath = path.join(__dirname, '../downloads', fileName);

        // Ensure the downloads directory exists
        const downloadsDir = path.join(__dirname, '../downloads');
        if (!fs.existsSync(downloadsDir)) {
            fs.mkdirSync(downloadsDir);
        }

        // Check if file exists, if not create a placeholder for demo purposes
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, `This is a placeholder for the ${productType} system download.`);
        }

        res.download(filePath, fileName, (err) => {
            if (err) {
                res.status(500).json({ message: 'Could not download the file. ' + err.message });
            }
        });

    } catch (error) {
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

    try {
        const fileName = productType === 'POS' ? 'hudi-pos-v1.zip' : 'hudi-hms-v1.zip';
        const filePath = path.join(__dirname, '../downloads', fileName);

        if (!fs.existsSync(filePath)) {
            // Ensure directory exists
            const downloadsDir = path.join(__dirname, '../downloads');
            if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir);
            
            // Create placeholder
            fs.writeFileSync(filePath, `This is a trial/demo placeholder for the ${productType} system download.`);
        }

        res.download(filePath, fileName, (err) => {
            if (err) {
                res.status(500).json({ message: 'Could not download the file.' });
            }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { downloadSystem, downloadDemo };
