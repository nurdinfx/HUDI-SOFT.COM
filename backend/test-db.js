const { MongoClient } = require('mongodb');

// Copied from .env
const uri = "mongodb://cismaankayse377_db_user:SGvPsgXFXBu882Df@ac-7hg12oy-shard-00-00.lqd1seh.mongodb.net:27017,ac-7hg12oy-shard-00-01.lqd1seh.mongodb.net:27017,ac-7hg12oy-shard-00-02.lqd1seh.mongodb.net:27017/hudi-soft?replicaSet=atlas-127lj7-shard-0&ssl=true&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";

async function run() {
    const client = new MongoClient(uri, { connectTimeoutMS: 5000, serverSelectionTimeoutMS: 5000 });
    try {
        console.log("Attempting to connect to MongoDB Atlas...");
        await client.connect();
        console.log("Success! Connected to MongoDB");
        const databasesList = await client.db().admin().listDatabases();
        console.log("Databases:");
        databasesList.databases.forEach(db => console.log(` - ${db.name}`));
    } catch (e) {
        console.error("Connection failed:");
        console.error(e);
    } finally {
        await client.close();
    }
}

run();
