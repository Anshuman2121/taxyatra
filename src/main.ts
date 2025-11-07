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

// New IPC handler for fetching user profile
ipcMain.handle('fetch-user-profile', async (_, pan: string, password: string) => {
  try {
    await userDataService.fetchAndSaveUserProfile(pan, password);
    return { success: true, message: 'User profile fetched and saved successfully' };
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
