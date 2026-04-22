/**
 * MongoDB connection (shared database, multi-tenant by tenantId).
 */
const mongoose = require('mongoose');
const { mongoUri, nodeEnv } = require('./env');

const connectDB = async () => {
  if (!mongoUri || mongoUri.includes('xxxxx')) {
    console.error(
      'MONGO_URI is missing or still the placeholder. Edit backend/.env and set MONGO_URI to your MongoDB Atlas connection string (e.g. from Atlas: Connect → Drivers → Node.js).'
    );
    process.exit(1);
  }
  try {
    const opts = nodeEnv === 'production' ? { maxPoolSize: 10 } : {};
    await mongoose.connect(mongoUri, opts);
    console.log('MongoDB connected');
  } catch (err) {
    if (err.message.includes('ENOTFOUND') || err.message.includes('querySrv')) {
      console.error(
        'MongoDB connection failed: invalid host in MONGO_URI. Use your real Atlas host (e.g. cluster0.xxxxx.mongodb.net). Get the full URI from MongoDB Atlas → Connect → Drivers.'
      );
    } else {
      console.error('MongoDB connection error:', err.message);
    }
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => console.log('MongoDB disconnected'));

module.exports = { connectDB };
