const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://sticktoonxyz_db_user:Rt4xGCUS18ovAWMA@cluster0.c2kwzel.mongodb.net/?appName=Cluster0';

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const User = require('./models/User');
    const WithdrawalRequest = require('./models/WithdrawalRequest');
    
    const email = 'secretplayer974@gmail.com';
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found:', email);
      process.exit(1);
    }
    
    console.log('✅ User found:', user.name);
    
    // Find pending withdrawal
    const withdrawal = await WithdrawalRequest.findOne({ 
      influencerId: user._id, 
      status: 'pending' 
    });
    
    if (!withdrawal) {
      console.log('❌ No pending withdrawal found');
      process.exit(1);
    }
    
    console.log('✅ Withdrawal found: ₹' + withdrawal.amount);
    
    // Update withdrawal status
    withdrawal.status = 'paid';
    withdrawal.processedAt = new Date();
    withdrawal.transactionId = 'ADMIN-PAID-' + Date.now();
    withdrawal.adminNote = 'Manually processed and confirmed paid';
    
    await withdrawal.save();
    console.log('✅ Withdrawal marked as PAID');
    
    // Update user's withdrawn amount
    await User.findByIdAndUpdate(user._id, {
      $inc: { 'influencerProfile.withdrawnAmount': withdrawal.amount },
    });
    console.log('✅ User withdrawn amount updated: +₹' + withdrawal.amount);
    
    console.log('\n📊 Summary:');
    console.log('   Name:', user.name);
    console.log('   Email:', user.email);
    console.log('   Amount: ₹' + withdrawal.amount);
    console.log('   Status: PAID');
    console.log('   Transaction ID:', withdrawal.transactionId);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
