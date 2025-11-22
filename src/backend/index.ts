import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { initDatabase, closeDatabase } from './database/connection';
import userDataService from './services/userDataService';
import { registerIpcHandlers } from './controllers/index';

// Declare Vite globals (only available in development)
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
    app.quit();
}

const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 1024,
        minHeight: 768,
        show: false, // Don't show until maximized
        icon: path.join(__dirname, '../../build/icon.png'),
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    mainWindow.maximize();
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // and load the index.html of the app.
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('Is development:', process.env.NODE_ENV === 'development');

    if (process.env.NODE_ENV === 'development') {
        // In development, use Vite dev server
        const devServerUrl = 'http://localhost:5173';
        console.log('Loading from Vite dev server:', devServerUrl);
        mainWindow.loadURL(devServerUrl);
    } else {
        // In production, load from built files
        const prodPath = path.join(__dirname, '../renderer/index.html');
        console.log('Loading from production build:', prodPath);
        mainWindow.loadFile(prodPath);
    }

    // Open the DevTools only in development.
    // Open the DevTools only in development.
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    // Set Content Security Policy
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    process.env.NODE_ENV === 'development'
                        ? "default-src 'self' 'unsafe-inline' data:; script-src 'self' 'unsafe-eval' 'unsafe-inline' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https:;"
                        : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https:;"
                ]
            }
        });
    });

    // Suppress autofill console errors
    mainWindow.webContents.on('console-message', (event, level, message) => {
        if (message.includes('Autofill.enable') || message.includes('Autofill.setAddresses')) {
            event.preventDefault();
        }
    });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
    try {
        console.log('🚀 [Main] App ready, initializing...');
        await initDatabase();
        console.log('✅ [Main] Database initialized');
        registerIpcHandlers();
        console.log('✅ [Main] IPC handlers registered');
        createWindow();
        console.log('✅ [Main] Window created');
    } catch (error) {
        console.error('❌ [Main] Failed to initialize app:', error);
        app.quit();
    }
});

app.on('before-quit', (event) => {
    console.log('🛑 [Main] App is quitting, closing database...');
    closeDatabase();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
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
