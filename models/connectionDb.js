// models/connectionDb.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connection = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    
    if (!mongoURI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }
    
    console.log('Connecting to MongoDB Atlas...');
    console.log('Database URL:', mongoURI.replace(/black@/, '****@')); // Hide password
    
    // Remove deprecated options
    await mongoose.connect(mongoURI);
    
    console.log('✅ MongoDB Connected to Atlas');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📦 Collections: ${collections.map(c => c.name).join(', ')}`);
    
    // Check if our collection exists
    const hasTourismPlaces = collections.some(c => c.name === 'tourismplaces');
    if (hasTourismPlaces) {
      const count = await mongoose.connection.db.collection('tourismplaces').countDocuments();
      console.log(`📈 tourismplaces collection has ${count} documents`);
      
      // Show sample document structure
      if (count > 0) {
        const sample = await mongoose.connection.db.collection('tourismplaces').findOne();
        console.log('📝 Sample document fields:', Object.keys(sample).join(', '));
        if (sample.properties) {
          console.log('📝 Properties fields:', Object.keys(sample.properties).join(', '));
        }
      }
    } else {
      console.log('⚠️ tourismplaces collection not found!');
    }
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

export default connection;