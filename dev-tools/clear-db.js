#!/usr/bin/env node

// Clear database for fresh development
const fs = require('fs');
const path = require('path');
const os = require('os');

// Get userData path manually since app might not be initialized
function getUserDataPath() {
  const platform = process.platform;
  const appName = 'taxyatra';
  
  switch (platform) {
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support', appName);
    case 'win32':
      return path.join(os.homedir(), 'AppData', 'Roaming', appName);
    default:
      return path.join(os.homedir(), '.config', appName);
  }
}

function clearDatabase() {
  const userDataPath = getUserDataPath();
  const dbFile = path.join(userDataPath, 'taxyatra.db');
  const encryptedFile = path.join(userDataPath, 'taxyatra.enc');
  
  try {
    if (fs.existsSync(dbFile)) {
      fs.unlinkSync(dbFile);
      console.log('✓ Removed taxyatra.db');
    }
    
    if (fs.existsSync(encryptedFile)) {
      fs.unlinkSync(encryptedFile);
      console.log('✓ Removed taxyatra.enc');
    }
    
    console.log('🎉 Database cleared! Start fresh.');
  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
  }
}

clearDatabase();
