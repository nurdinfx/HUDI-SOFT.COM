import User from '../models/User.js';
import Branch from '../models/Branch.js';
import bcrypt from 'bcryptjs';

const DEMO_ACCOUNTS = [
  { email: 'admin@demo.com', password: 'admin123', name: 'Demo Admin', role: 'admin' },
  { email: 'manager@demo.com', password: 'manager123', name: 'Demo Manager', role: 'manager' },
  { email: 'cashier@demo.com', password: 'cashier123', name: 'Demo Cashier', role: 'cashier' },
  { email: 'chef@demo.com', password: 'chef123', name: 'Demo Chef', role: 'chef' },
  { email: 'waiter@demo.com', password: 'waiter123', name: 'Demo Waiter', role: 'waiter' }
];

export const seedDatabase = async () => {
  try {
    console.log('🌱 Checking for demo data in database...');
    
    // 1. Get or create demo branch
    let demoBranch = await Branch.findOne({ branchCode: 'DEMO' });
    if (!demoBranch) {
      demoBranch = await Branch.create({
        name: 'Demo Restaurant',
        branchCode: 'DEMO',
        address: '123 Demo Street, Demo City',
        phone: '+1 (555) 123-DEMO',
        email: 'demo@restaurant.com',
        isActive: true,
        settings: {
          taxRate: 10,
          serviceCharge: 5,
          currency: 'USD',
          timezone: 'UTC'
        }
      });
      console.log('✅ Created Demo Branch');
    }

    // 2. Ensure each demo account exists
    for (const demoAccount of DEMO_ACCOUNTS) {
      const userExists = await User.findOne({ email: demoAccount.email });
      if (!userExists) {
        // We use bcrypt here because the User model's pre-save hook handles hashing
        // If the User model doesn't handle it, we'd need to hash it here too.
        // Let's check User model pre-save hook first (I'll do it in a moment)
        
        await User.create({
          name: demoAccount.name,
          email: demoAccount.email,
          username: demoAccount.email,
          password: demoAccount.password,
          role: demoAccount.role,
          branch: demoBranch._id,
          isActive: true
        });
        console.log(`✅ Seeded User: ${demoAccount.email}`);
      }
    }
    
    console.log('🌱 Database seeding complete');
  } catch (error) {
    console.error('❌ Database seeding error:', error.message);
  }
};
