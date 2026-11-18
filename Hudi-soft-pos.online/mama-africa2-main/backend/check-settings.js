import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://cismaankayse377_db_user:2gsKLaInMGCAco7Y@ac-0cm5ssh-shard-00-00.ldpdnfr.mongodb.net:27017,ac-0cm5ssh-shard-00-01.ldpdnfr.mongodb.net:27017,ac-0cm5ssh-shard-00-02.ldpdnfr.mongodb.net:27017/?ssl=true&replicaSet=atlas-4201ob-shard-0&authSource=admin&retryWrites=true&w=majority&appName=hudisoftposonline';

const userSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
const User = mongoose.model('User', userSchema);

const settingsSchema = new mongoose.Schema({}, { strict: false, collection: 'settings' });
const Setting = mongoose.model('Setting', settingsSchema);

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  const users = await User.find({});
  console.log('\n--- USERS ---');
  for (const u of users) {
    console.log(`Username: ${u.username || u.email}, Role: ${u.role}, Branch ID: ${u.branch}`);
  }

  const settings = await Setting.find({});
  console.log('\n--- SETTINGS ---');
  for (const s of settings) {
    console.log(`Setting ID: ${s._id}, Branch: ${s.branch}, Restaurant: ${s.restaurantName}`);
    console.log(`  zaad: "${s.zaad}", sahal: "${s.sahal}", edahab: "${s.edahab}", myCash: "${s.myCash}"`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
