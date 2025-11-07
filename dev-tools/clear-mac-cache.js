#!/usr/bin/env node

// Clear all macOS caches for TaxYatra app
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const appName = 'taxyatra';

function clearDirectory(dirPath, description) {
  try {
    if (fs.existsSync(dirPath)) {
      execSync(`rm -rf "${dirPath}"`);
      console.log(`✓ Cleared ${description}: ${dirPath}`);
    } else {
      console.log(`- ${description} not found: ${dirPath}`);
    }
  } catch (error) {
    console.error(`❌ Failed to clear ${description}:`, error.message);
  }
}

function clearMacCache() {
  console.log('🧹 Clearing macOS caches for TaxYatra...\n');
  
  // Project caches
  clearDirectory(path.join(process.cwd(), 'out'), 'Build output');
  clearDirectory(path.join(process.cwd(), '.vite'), 'Vite cache');
  
  // App data caches
  const homeDir = os.homedir();
  clearDirectory(path.join(homeDir, 'Library', 'Application Support', appName), 'App data');
  clearDirectory(path.join(homeDir, 'Library', 'Caches', appName), 'App cache');
  clearDirectory(path.join(homeDir, 'Library', 'Preferences', `com.${appName}.app.plist`), 'App preferences');
  
  // Development caches
  clearDirectory(path.join(homeDir, '.electron-gyp'), 'Electron gyp cache');
  clearDirectory(path.join(homeDir, '.cache', 'electron'), 'Electron cache');
  clearDirectory(path.join(homeDir, '.npm'), 'NPM cache');
  
  
  console.log('\n🎉 Cache clearing complete!');
  console.log('💡 Run "npm install" to reinstall dependencies');
}

clearMacCache();
