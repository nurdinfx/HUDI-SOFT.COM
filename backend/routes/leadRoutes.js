const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Create new lead (Public)
// @route   POST /api/leads
// @access  Public
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, companyName, systemType, zipCode } = req.body;
        console.log(`📝 Processing New Lead: ${name} (${email}) for system: ${systemType}`);

        const lead = await Lead.create({
            name,
            email,
            phone,
            companyName,
            systemType,
            zipCode
        });

        let trialInfo = null;
        let productType = '';
        if (systemType.includes('POS Online')) productType = 'POS_ONLINE';
        else if (systemType.includes('POS')) productType = 'POS_OFFLINE';
        else if (systemType.includes('Hospital')) productType = 'HMS';

        // Automatically generate a 3-day trial license for POS or HMS
        if (productType) {
            const crypto = require('crypto');
            const License = require('../models/License');
            
            const licenseKey = crypto.randomUUID().toUpperCase();
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 3);

            const trialLicense = await License.create({
                companyName: companyName || name,
                productType: productType,
                subscriptionType: 'Monthly',
                price: 0,
                expiryDate: expiryDate,
                status: 'Active',
                isTrial: true,
                leadId: lead._id,
                licenseKey
            });

            lead.trialLicenseKey = licenseKey;
            lead.trialExpiryDate = expiryDate;
            await lead.save();

            const host = req.get('host');
            const protocol = host.includes('localhost') ? req.protocol : 'https';
            const downloadUrl = `${protocol}://${host}/api/downloads/demo/${productType}`;

            trialInfo = {
                licenseKey,
                expiryDate,
                downloadUrl: downloadUrl
            };
            
            console.log(`Generated trial Info for ${companyName}:`, {
                licenseKey,
                downloadUrl
            });
        }

        res.status(201).json({
            success: true,
            message: 'Demo request submitted successfully',
            data: lead,
            trial: trialInfo
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Get all leads (Admin only)
// @route   GET /api/leads/admin
// @access  Private/Admin
router.get('/admin', protect, admin, async (req, res) => {
    try {
        const leads = await Lead.find({}).sort({ createdAt: -1 });
        res.json(leads);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Update lead status (Admin only)
// @route   PUT /api/leads/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);

        if (lead) {
            lead.status = req.body.status || lead.status;
            lead.notes = req.body.notes || lead.notes;

            const updatedLead = await lead.save();
            res.json(updatedLead);
        } else {
            res.status(404).json({ message: 'Lead not found' });
        }
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
