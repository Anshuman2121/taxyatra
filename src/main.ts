import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { initDatabase, closeDatabase, getDatabase } from './database/database';
import { isAppActivated, validateAndStoreActivationCode } from './database/registration';
import userDataService from './services/userDataService';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools only in development.
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  try {
    await initDatabase();
    await userDataService.initializeTables();
    createWindow();
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
});

// IPC handlers
ipcMain.handle('check-activation', () => {
  try {
    return isAppActivated();
  } catch (error) {
    console.error('Error checking activation:', error);
    return false;
  }
});

ipcMain.handle('validate-activation-code', (_, code: string) => {
  try {
    return validateAndStoreActivationCode(code);
  } catch (error) {
    console.error('Error validating activation code:', error);
    return false;
  }
});

ipcMain.handle('save-pan-credentials', (_, pan: string, password: string) => {
  try {
    const db = getDatabase();
    db.run('INSERT OR REPLACE INTO pan_credentials (pan, password, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)', 
      [pan, password], (err) => {
        if (err) {
          console.error('Error saving PAN credentials:', err);
        }
      });
    return true;
  } catch (error) {
    console.error('Error saving PAN credentials:', error);
    return false;
  }
});

ipcMain.handle('get-pan-credentials', () => {
  return new Promise((resolve, reject) => {
    try {
      const db = getDatabase();
      db.all('SELECT pan, created_at FROM pan_credentials ORDER BY created_at DESC', (err, rows) => {
        if (err) {
          console.error('Error getting PAN credentials:', err);
          resolve([]);
        } else {
          resolve(rows);
        }
      });
    } catch (error) {
      console.error('Error getting PAN credentials:', error);
      resolve([]);
    }
  });
});

ipcMain.handle('get-pan-with-password', (_, pan: string) => {
  return new Promise((resolve, reject) => {
    try {
      const db = getDatabase();
      db.get('SELECT pan, password FROM pan_credentials WHERE pan = ?', [pan], (err, row) => {
        if (err) {
          console.error('Error getting PAN with password:', err);
          resolve(null);
        } else {
          resolve(row);
        }
      });
    } catch (error) {
      console.error('Error getting PAN with password:', error);
      resolve(null);
    }
  });
});

// Puppeteer login function
async function loginWithPuppeteer(pan: string, password: string) {
  const puppeteer = require('puppeteer-extra');
  const StealthPlugin = require('puppeteer-extra-plugin-stealth');
  puppeteer.use(StealthPlugin());

  console.log('Starting browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });

  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      delete navigator.__proto__.webdriver;
    });
    
    console.log('Navigating to login page...');
    await page.goto('https://eportal.incometax.gov.in/iec/foservices/#/login', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('Entering PAN...');
    await page.waitForSelector('#panAdhaarUserId');
    await page.type('#panAdhaarUserId', pan);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Clicking Continue...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const continueBtn = btns.find(b => b.textContent.includes('Continue'));
      if (continueBtn) continueBtn.click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 4000));
    console.log('Checking secure access checkbox...');
    await page.waitForSelector('#passwordCheckBox-input');
    await page.click('#passwordCheckBox-input');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Entering password...');
    await page.waitForSelector('#loginPasswordField');
    await page.type('#loginPasswordField', password);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Clicking Login...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const loginBtn = btns.find(b => b.textContent.includes('Continue'));
      if (loginBtn) loginBtn.click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check for "session already active" popup and click "Login Here"
    const pageText = await page.evaluate(() => document.body.innerText);
    if (pageText.includes('Dual Login') || pageText.includes('session') && pageText.includes('active')) {
      console.log('Dual login detected, clicking Login Here...');
      await page.evaluate(() => {
        const allElements = Array.from(document.querySelectorAll('*'));
        const loginHereBtn = allElements.find(el => 
          el.textContent && el.textContent.trim() === 'Login Here' && 
          (el.tagName === 'BUTTON' || el.onclick || el.style.cursor === 'pointer')
        );
        if (loginHereBtn) {
          loginHereBtn.click();
        }
      });
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else {
      await new Promise(resolve => setTimeout(resolve, 7000));
    }
    
    console.log('Capturing cookies...');
    const cookies = await page.cookies();
    const authToken = cookies.find(c => c.name === 'AuthToken');
    
    const finalUrl = page.url();
    console.log('Final URL:', finalUrl);
    
    await browser.close();
    console.log('Browser closed');
    
    if (authToken) {
      console.log('✅ Login successful! AuthToken captured');
      return { success: true, cookies, authToken: authToken.value };
    } else {
      console.log('❌ No AuthToken found');
      throw new Error('Login failed - no AuthToken received');
    }
  } catch (error) {
    await browser.close();
    throw error;
  }
}

// New IPC handler for fetching user profile
ipcMain.handle('fetch-user-profile', async (_, pan: string, password: string) => {
  try {
    const result = await loginWithPuppeteer(pan, password);
    return result;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return { success: false, message: error.message };
  }
});

// New IPC handler for getting user data from database
ipcMain.handle('get-user-data', async (_, pan: string) => {
  try {
    const userData = await userDataService.getUserData(pan);
    return { success: true, data: userData };
  } catch (error) {
    console.error('Error getting user data:', error);
    return { success: false, message: error.message };
  }
});

app.on('before-quit', () => {
  closeDatabase();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
