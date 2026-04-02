const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupGoogleDrive() {
  console.log('\n🔧 Google Drive Setup Helper\n');
  console.log('Follow these steps to enable FREE Google Drive backups:\n');
  
  console.log('📋 STEP 1: Create Folders in Your Google Drive');
  console.log('   1. Go to https://drive.google.com');
  console.log('   2. Create this folder structure:');
  console.log('      StickToon/');
  console.log('      ├── badge/');
  console.log('      ├── images/');
  console.log('      └── sticker/\n');
  
  console.log('📋 STEP 2: Share Each Folder (badge, images, sticker)');
  console.log('   1. Right-click folder → Share');
  console.log('   2. Add this email: drive-uploader@sticktoon-483207.iam.gserviceaccount.com');
  console.log('   3. Set permission to: Editor');
  console.log('   4. Uncheck "Notify people"');
  console.log('   5. Click Share\n');
  
  console.log('📋 STEP 3: Get Folder IDs');
  console.log('   1. Open each folder in Google Drive');
  console.log('   2. Copy the ID from URL:');
  console.log('      https://drive.google.com/drive/folders/[FOLDER_ID_HERE]');
  console.log('      Example: 1a2b3c4d5e6f7g8h9i0j\n');
  
  const ready = await question('Have you completed the above steps? (yes/no): ');
  
  if (ready.toLowerCase() !== 'yes') {
    console.log('\n⏸️  Setup paused. Complete the steps above and run this script again.');
    rl.close();
    return;
  }
  
  console.log('\n📝 Enter your folder IDs:\n');
  
  const badgeFolderId = await question('Badge folder ID: ');
  const imagesFolderId = await question('Images folder ID: ');
  const stickerFolderId = await question('Sticker folder ID: ');
  
  if (!badgeFolderId || !imagesFolderId || !stickerFolderId) {
    console.log('\n❌ Error: All folder IDs are required.');
    rl.close();
    return;
  }
  
  // Update .env file
  const envPath = path.join(__dirname, '../.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Remove existing Google Drive folder IDs if present
  envContent = envContent.replace(/GOOGLE_DRIVE_BADGE_FOLDER_ID=.*/g, '');
  envContent = envContent.replace(/GOOGLE_DRIVE_IMAGES_FOLDER_ID=.*/g, '');
  envContent = envContent.replace(/GOOGLE_DRIVE_STICKER_FOLDER_ID=.*/g, '');
  
  // Add new folder IDs
  const driveConfig = `
# Google Drive Folder IDs (Shared folders from personal Drive)
GOOGLE_DRIVE_BADGE_FOLDER_ID=${badgeFolderId}
GOOGLE_DRIVE_IMAGES_FOLDER_ID=${imagesFolderId}
GOOGLE_DRIVE_STICKER_FOLDER_ID=${stickerFolderId}
`;
  
  envContent = envContent.trim() + '\n' + driveConfig;
  
  fs.writeFileSync(envPath, envContent);
  
  console.log('\n✅ Google Drive folder IDs saved to .env!\n');
  console.log('📋 Configuration:');
  console.log(`   Badge:   ${badgeFolderId}`);
  console.log(`   Images:  ${imagesFolderId}`);
  console.log(`   Sticker: ${stickerFolderId}\n`);
  
  console.log('✨ Next steps:');
  console.log('   1. Restart your server: npm run dev');
  console.log('   2. Test upload: node scripts/uploadExisting.js badge');
  console.log('   3. Check your Google Drive to see uploaded files!\n');
  
  rl.close();
}

setupGoogleDrive().catch(console.error);
