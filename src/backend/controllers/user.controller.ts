import { ipcMain } from 'electron';
import puppeteerService from '../services/puppeteer.service';
import userDataService from '../services/userDataService';

export function registerUserHandlers() {
    ipcMain.handle('fetch-user-profile', async (_, pan: string, password: string) => {
        try {
            const result = await puppeteerService.login(pan, password);

            // If login successful, fetch and save full profile
            if (result.success) {
                try {
                    await userDataService.fetchAndSaveUserProfile(pan, password, result.cookies);
                } catch (saveError) {
                    console.error('Error saving user profile after login:', saveError);
                    // We still return success for login, but maybe warn?
                }
            }

            return result;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return { success: false, message: error.message };
        }
    });

    ipcMain.handle('get-user-data', async (_, pan: string) => {
        try {
            const userData = await userDataService.getUserData(pan);
            return { success: true, data: userData };
        } catch (error) {
            console.error('Error getting user data:', error);
            return { success: false, message: error.message };
        }
    });
}
