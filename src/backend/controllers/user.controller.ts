import { ipcMain } from 'electron';
import userService from '../services/user.service';
import puppeteerService from '../services/puppeteer.service';
import { IPC_CHANNELS } from '../../shared/constants';

export const registerUserHandlers = () => {
  ipcMain.handle('fetch-user-profile', async (_, pan: string, password: string) => {
    try {
      const result = await puppeteerService.loginWithPuppeteer(pan, password);
      return result;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('get-user-data', async (_, pan: string) => {
    try {
      const userData = await userService.getUserData(pan);
      return { success: true, data: userData };
    } catch (error) {
      console.error('Error getting user data:', error);
      return { success: false, message: error.message };
    }
  });
};
