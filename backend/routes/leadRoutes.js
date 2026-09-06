const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const { protect, admin } = require('../middleware/authMiddleware');
const syncCustomerEmail = require('../utils/syncCustomerEmail');

// @desc    Create new lead (Public)
// @route   POST /api/leads
// @access  Public
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, companyName, systemType, zipCode } = req.body;
        console.log(`📝 Processing New Lead: ${name} (${email})`);
        console.log('Incoming systemType:', systemType);

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
        const lowerSystemType = systemType.toLowerCase();
        
        if (lowerSystemType.includes('pos online')) productType = 'POS_ONLINE';
        else if (lowerSystemType.includes('pos desktop') || lowerSystemType.includes('pos offline')) productType = 'POS_OFFLINE';
        else if (lowerSystemType.includes('detail care') || lowerSystemType.includes('datel care') || lowerSystemType.includes('dental') || lowerSystemType.includes('clinic') || lowerSystemType.includes('datel clinic')) productType = 'DATEL_CLINIC';
        else if (lowerSystemType.includes('school') || lowerSystemType.includes('sms')) productType = 'SMS';
        else if (lowerSystemType.includes('inventory') || lowerSystemType.includes('hospital') || lowerSystemType.includes('hms')) productType = 'HMS';
        else if (lowerSystemType.includes('desktop')) productType = 'POS_OFFLINE'; // Fallback for general desktop requests

        console.log(`💡 Product Type resolved as: ${productType || 'NONE'}`);

        // Sync customer email to central DB
        await syncCustomerEmail({
            email: lead.email,
            name: lead.name,
            companyName: lead.companyName,
            product: productType || 'Other',
            source: 'account',
            subscriptionStatus: productType ? 'Trial' : 'None',
            hasActiveLicense: !!productType
        });

        // Automatically generate a 3-day trial (matches RequestDemo.jsx) license for POS or HMS
        if (productType) {
            const crypto = require('crypto');
            const License = require('../models/License');
            
            const licenseKey = crypto.randomUUID().toUpperCase();
            // Each license gets its OWN independent startDate and expiryDate.
            // These are set ONCE here and never overwritten by subsequent activations.
            const startDate = new Date();
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 3);

            const trialLicense = await License.create({
                companyName: companyName || name,
                productType: productType,
                subscriptionType: 'Monthly',
                price: 0,
                startDate: startDate,
                activationDate: startDate,
                expiryDate: expiryDate,
                status: 'Active',
                isTrial: true,
                leadId: lead._id,
                licenseKey,
                maxDevices: 10,
                activeDevices: [],
                machineIDs: []
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





