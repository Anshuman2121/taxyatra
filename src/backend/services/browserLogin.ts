import { BrowserWindow } from 'electron';

export async function loginWithBrowser(pan: string, password: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const loginWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    loginWindow.loadURL('https://eportal.incometax.gov.in/iec/foservices/');

    loginWindow.webContents.on('did-finish-load', async () => {
      const cookies = await loginWindow.webContents.session.cookies.get({});
      console.log('Cookies after page load:', cookies);
    });

    // Listen for successful login (when user reaches dashboard)
    loginWindow.webContents.on('did-navigate', async (event, url) => {
      if (url.includes('dashboard') || url.includes('home')) {
        const cookies = await loginWindow.webContents.session.cookies.get({});
        const authToken = cookies.find(c => c.name === 'AuthToken');
        
        if (authToken) {
          loginWindow.close();
          resolve({ success: true, cookies, authToken: authToken.value });
        }
      }
    });

    loginWindow.on('closed', () => {
      reject(new Error('Login window closed'));
    });
  });
}