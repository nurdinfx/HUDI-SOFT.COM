require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI;

const createAdmin = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB...');

        const email = 'admin@hudisoft.com';
        const password = 'admin123'; // NEW PASSWORD
        const companyName = 'HUDI SOFT';

        // Delete if exists and recreate
        await User.deleteOne({ email });
        
        await User.create({
            email,
            password,
            companyName,
            role: 'admin'
        });
        
        console.log('Admin user recreated successfully.');
        console.log('------------------------------');
        console.log('Email: ' + email);
        console.log('Password: ' + password);
        console.log('------------------------------');
        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin();
