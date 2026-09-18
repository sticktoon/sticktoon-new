const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { MONGO_URI } = process.env;

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    
    const User = require('./models/User');
    const WithdrawalRequest = require('./models/WithdrawalRequest');
    
    const email = 'secretplayer974@gmail.com';
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found:', email);
      process.exit(1);
    }
    
    console.log('✅ User found:', user.name, '\nUser ID:', user._id);
    
    // Find ALL withdrawals for this user
    const withdrawals = await WithdrawalRequest.find({ influencerId: user._id }).sort({ createdAt: -1 });
    
    console.log('\n📋 All Withdrawals:');
    if (withdrawals.length === 0) {
      console.log('   No withdrawals found');
    } else {
      withdrawals.forEach((w, i) => {
        console.log(`\n   [${i + 1}] Status: ${w.status} | Amount: ₹${w.amount} | Date: ${new Date(w.createdAt).toLocaleString()}`);
        console.log(`       ID: ${w._id}`);
      });
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
