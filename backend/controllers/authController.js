const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await user.comparePassword(password))) {
            res.json({
                _id: user._id,
                companyName: user.companyName,
                email: user.email,
                role: user.role,
                token: generateToken(user._id, user.role),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Register a new admin (Setup utility, should be secured or removed later)
// @route   POST /api/auth/register-admin
// @access  Public (for initial setup only)
const registerAdmin = async (req, res) => {
    const { email, password, companyName } = req.body;

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            email,
            password,
            companyName,
            role: 'admin'
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                email: user.email,
                role: user.role,
                token: generateToken(user._id, user.role),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { authUser, registerAdmin };
