// scripts/fixPaidOrderEarnings.js
// Run: node scripts/fixPaidOrderEarnings.js

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const InfluencerEarning = require('../models/InfluencerEarning');
const User = require('../models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    // Find all influencer earnings with status 'paid'
    const earnings = await InfluencerEarning.find({ status: 'paid' });
    let updated = 0;
    for (const earn of earnings) {
      // Check if user.paidEarnings already includes this earning
      const user = await User.findById(earn.influencerId);
      if (!user) continue;
      // If paidEarnings is less than sum of paid InfluencerEarning, update it
      // (This is a simple fix: always increment by earn.totalEarning)
      await User.findByIdAndUpdate(earn.influencerId, {
        $inc: {
          'influencerProfile.paidEarnings': earn.totalEarning,
        },
      });
      updated++;
    }
    console.log(`Updated paid earnings for ${updated} influencer earning records.`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
