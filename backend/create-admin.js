const mongoose = require('mongoose');
const User = require('./models/User'); // Assuming User model has bcrypt hashing logic
require('dotenv').config();

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const email = 'cismaankayse377@gmail.com';
        const password = 'admin123';
        const companyName = 'HUDI SOFT';

        const userExists = await User.findOne({ email });
        if (userExists) {
            console.log('User already exists');
            process.exit(0);
        }

        const user = await User.create({
            email,
            password, // Mongoose middleware should hash this
            companyName,
            role: 'admin'
        });

        console.log('Admin user created successfully:', user.email);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

createAdmin();
