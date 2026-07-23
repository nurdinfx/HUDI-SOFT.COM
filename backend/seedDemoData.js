require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./models/Lead');
const Order = require('./models/Order');
const License = require('./models/License');

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hudisoft';

const seedData = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB for seeding...');

        // Wait, we need a dummy user ID for the orders and licenses
        // If we don't have one, we can just generate a random ObjectId
        const dummyUserId = new mongoose.Types.ObjectId();

        const leads = [
            {
                name: 'Ahmed Ali',
                email: 'ahmed.ali@example.com',
                phone: '+252 61 1234567',
                companyName: 'Mogadishu General Hospital',
                systemType: 'HMS',
                status: 'New'
            },
            {
                name: 'Fatima Hassan',
                email: 'fatima@supermart.so',
                phone: '+252 61 7654321',
                companyName: 'SuperMart Digfeer',
                systemType: 'POS',
                status: 'Qualified'
            },
            {
                name: 'Omar Abdi',
                email: 'omar.abdi@clinics.so',
                phone: '+252 61 9988776',
                companyName: 'Banaadir Specialty Clinic',
                systemType: 'HMS',
                status: 'Contacted'
            },
            {
                name: 'Zahra Osman',
                email: 'zahra@retailgroup.com',
                phone: '+252 61 2233445',
                companyName: 'Zahra Retail Group',
                systemType: 'POS',
                status: 'Converted',
            }
        ];

        const orders = [
            {
                userId: dummyUserId,
                companyName: 'Mogadishu General Hospital',
                productType: 'HMS',
                subscriptionType: 'FiveYear',
                price: 1500,
                paymentMethod: 'EVC Plus',
                paymentScreenshotUrl: '/uploads/dummy_screenshot1.png',
                status: 'Verified'
            },
            {
                userId: dummyUserId,
                companyName: 'SuperMart Digfeer',
                productType: 'POS',
                subscriptionType: 'Monthly',
                price: 50,
                paymentMethod: 'ZAAD',
                paymentScreenshotUrl: '/uploads/dummy_screenshot2.png',
                status: 'Verified'
            },
            {
                userId: dummyUserId,
                companyName: 'Bakal Pharmacy',
                productType: 'POS',
                subscriptionType: 'Monthly',
                price: 50,
                paymentMethod: 'Sahal',
                paymentScreenshotUrl: '/uploads/dummy_screenshot3.png',
                status: 'Pending'
            }
        ];

        const licenses = [
            {
                userId: dummyUserId,
                companyName: 'Mogadishu General Hospital',
                productType: 'HMS',
                subscriptionType: 'FiveYear',
                price: 1500,
                activationDate: new Date(),
                expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 5)),
                status: 'Active',
                licenseKey: 'HMS-MOG-1234-5678',
                machineID: 'MAC-1A-2B-3C-4D'
            },
            {
                userId: dummyUserId,
                companyName: 'SuperMart Digfeer',
                productType: 'POS',
                subscriptionType: 'Monthly',
                price: 50,
                activationDate: new Date(),
                expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
                status: 'Active',
                licenseKey: 'POS-SUP-8765-4321',
                machineID: 'MAC-9Z-8Y-7X-6W'
            },
            {
                userId: dummyUserId,
                companyName: 'Old Clinic',
                productType: 'HMS',
                subscriptionType: 'Monthly',
                price: 100,
                activationDate: new Date(new Date().setMonth(new Date().getMonth() - 2)),
                expiryDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
                status: 'Expired',
                licenseKey: 'HMS-OLD-0000-0000'
            }
        ];

        await Lead.insertMany(leads);
        await Order.insertMany(orders);
        await License.insertMany(licenses);

        console.log('Demo data successfully seeded!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedData();
