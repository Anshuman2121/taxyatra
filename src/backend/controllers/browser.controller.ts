import { ipcMain } from 'electron';
import { browserService } from '../services/browser.service';

export function registerBrowserHandlers() {
  ipcMain.handle('browser:detect', async () => {
    try {
      const browsers = await browserService.detectBrowsers();
      return { success: true, browsers };
    } catch (error: any) {
      console.error('❌ [Browser] Detection failed:', error);
      return { success: false, message: error.message, browsers: [] };
    }
  });

  ipcMain.handle('browser:select', async (_, browserPath: string) => {
    try {
      const result = await browserService.setBrowser(browserPath);
      return result;
    } catch (error: any) {
      console.error('❌ [Browser] Selection failed:', error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('browser:get-selected', async () => {
    try {
      const browserInfo = await browserService.getSelectedBrowserInfo();
      return { success: true, browser: browserInfo };
    } catch (error: any) {
      console.error('❌ [Browser] Get selected failed:', error);
      return { success: false, message: error.message, browser: null };
    }
  });

  ipcMain.handle('browser:clear', async () => {
    try {
      browserService.clearSelection();
      return { success: true };
    } catch (error: any) {
      console.error('❌ [Browser] Clear failed:', error);
      return { success: false, message: error.message };
    }
  });

  console.log('✅ [Browser] Handlers registered');
}
