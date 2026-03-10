require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const sendEmail = require('../utils/sendEmail');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const email = process.argv[2] || 'secretplayer974@gmail.com';
    
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
    }).populate('influencerId', 'name email influencerProfile');
    
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
    console.log('✅ Withdrawal status updated to: PAID');
    
    // Update user's withdrawn amount
    await User.findByIdAndUpdate(withdrawal.influencerId._id, {
      $inc: { 'influencerProfile.withdrawnAmount': withdrawal.amount },
    });
    console.log('✅ User withdrawn amount updated');
    
    // Send confirmation email
    await sendEmail({
      to: withdrawal.influencerId.email,
      subject: `Payment of ₹${withdrawal.amount} Processed!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #10b981;">Payment Successful!</h1>
          <p>Hi ${withdrawal.influencerId.name},</p>
          <p>Your withdrawal request has been processed.</p>
          <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #10b981;">₹${withdrawal.amount}</p>
            <p style="margin: 5px 0 0; color: #6b7280;">Transaction ID: ${withdrawal.transactionId}</p>
          </div>
          <p>Thank you for being a StickToon influencer!</p>
        </div>
      `,
    });
    
    console.log('✅ Confirmation email sent to:', withdrawal.influencerId.email);
    console.log('\n📊 Summary:');
    console.log('   Name:', withdrawal.influencerId.name);
    console.log('   Amount: ₹' + withdrawal.amount);
    console.log('   Status: PAID');
    console.log('   Transaction ID:', withdrawal.transactionId);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
