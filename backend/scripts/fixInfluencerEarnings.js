require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
// scripts/fixInfluencerEarnings.js
// Run: node scripts/fixInfluencerEarnings.js

const mongoose = require('mongoose');
const path = require('path');
const InfluencerEarning = require('../models/InfluencerEarning');
const User = require('../models/User');
const connectDB = require('../config/db');

(async () => {
  try {
    await connectDB();
    const earnings = await InfluencerEarning.find({ status: 'pending' });
    for (const earn of earnings) {
      earn.status = 'paid';
      await earn.save();
      await User.findByIdAndUpdate(earn.influencerId, {
        $inc: {
          'influencerProfile.pendingEarnings': -earn.totalEarning,
          'influencerProfile.paidEarnings': earn.totalEarning,
        },
      });
    }
    console.log('All pending influencer earnings set to paid.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
