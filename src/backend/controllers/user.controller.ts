import { ipcMain } from 'electron';
import puppeteerService from '../services/puppeteer.service';
import userDataService from '../services/userDataService';

export function registerUserHandlers() {
    ipcMain.handle('fetch-user-profile', async (event, pan: string, password: string) => {
        try {
            const sendProgress = (status: string) => {
                event.sender.send('fetch-progress', status);
            };

            const result = await puppeteerService.login(pan, password, sendProgress);

            if (result.success) {
                try {
                    sendProgress('Fetching profile data...');
                    const ITRApiService = (await import('../services/api')).default;
                    const prefillData = await ITRApiService.fetchAllUserData(pan, password, result.cookies);
                    sendProgress('✅ Profile data fetched successfully!');
                    return { success: true, data: prefillData };
                } catch (apiError) {
                    sendProgress('❌ ' + apiError.message);
                    return { success: false, message: apiError.message };
                }
            }

            return result;
        } catch (error) {
            event.sender.send('fetch-progress', '❌ ' + error.message);
            return { success: false, message: error.message };
        }
    });


}
