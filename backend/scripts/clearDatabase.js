require('dotenv').config();
const mongoose = require('mongoose');
const ImageUpload = require('../models/ImageUpload');

async function clearDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database\n');
    
    const count = await ImageUpload.countDocuments();
    console.log(`📊 Found ${count} upload records in database`);
    
    if (count === 0) {
      console.log('✅ Database is already empty');
      await mongoose.connection.close();
      return;
    }
    
    console.log('🗑️  Deleting all upload records...');
    await ImageUpload.deleteMany({});
    
    console.log('✅ Database cleared! All upload records deleted.');
    console.log('\n💡 Now run: node scripts/uploadExisting.js badge');
    console.log('           node scripts/uploadExisting.js images');
    console.log('           node scripts/uploadExisting.js sticker');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

clearDatabase();
