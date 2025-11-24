import { ipcMain, app } from 'electron';
import path from 'path';
import fs from 'fs';
import puppeteerService from '../services/puppeteer.service';

export function registerDownloadHandlers() {
    ipcMain.handle('download:26as', async (_, pan: string, password: string, assessmentYear: string) => {
        console.log('📥 [Download Controller] 26AS download requested for PAN:', pan, 'AY:', assessmentYear);

        try {
            // Step 1: Login to get fresh cookies
            console.log('🔐 [Download Controller] Logging in to get session cookies...');
            const loginResult = await puppeteerService.login(pan, password, (status) => {
                console.log('📊 [Download Controller] Login progress:', status);
            });

            if (!loginResult.success || !loginResult.cookies) {
                console.error('❌ [Download Controller] Login failed:', loginResult.message);
                return {
                    success: false,
                    message: loginResult.message || 'Login failed'
                };
            }

            console.log('✅ [Download Controller] Login successful, got cookies');

            // Step 2: Create download directory if it doesn't exist
            const downloadsDir = path.join(app.getPath('downloads'), 'TaxYatra', '26AS', pan);
            if (!fs.existsSync(downloadsDir)) {
                fs.mkdirSync(downloadsDir, { recursive: true });
                console.log('📁 [Download Controller] Created download directory:', downloadsDir);
            }

            // Step 3: Download 26AS using the fresh cookies
            console.log('📥 [Download Controller] Starting 26AS download...');
            const result = await puppeteerService.download26AS(
                loginResult.cookies,
                assessmentYear,
                downloadsDir,
                (status) => {
                    console.log('📊 [Download Controller] Download progress:', status);
                }
            );

            // Step 4: Logout to clean up session
            try {
                console.log('🚪 [Download Controller] Logging out...');
                await puppeteerService.logout(loginResult.cookies);
                console.log('✅ [Download Controller] Logged out successfully');
            } catch (logoutError) {
                console.log('⚠️ [Download Controller] Logout failed (non-critical):', logoutError);
            }

            if (result.success) {
                console.log('✅ [Download Controller] 26AS downloaded successfully:', result.filePath);
                return {
                    success: true,
                    filePath: result.filePath,
                    message: '26AS downloaded successfully'
                };
            } else {
                console.error('❌ [Download Controller] 26AS download failed:', result.message);
                return {
                    success: false,
                    message: result.message || 'Download failed'
                };
            }
        } catch (error: any) {
            console.error('❌ [Download Controller] Error downloading 26AS:', error);
            return {
                success: false,
                message: error.message || 'Unknown error occurred'
            };
        }
    });

    ipcMain.handle('download:ais', async (event, pan: string, password: string) => {
        console.log('📥 [Download Controller] AIS download requested for PAN:', pan);

        try {
            // Create download directory if it doesn't exist
            const downloadsDir = path.join(app.getPath('downloads'), 'TaxYatra', 'AIS', pan);
            if (!fs.existsSync(downloadsDir)) {
                fs.mkdirSync(downloadsDir, { recursive: true });
                console.log('📁 [Download Controller] Created download directory:', downloadsDir);
            }

            // Download AIS (login happens within the same browser session)
            console.log('📥 [Download Controller] Starting AIS download with login...');
            const result = await puppeteerService.downloadAIS(
                pan,
                password,
                downloadsDir,
                event, // Pass the event object for captcha communication
                (status: string) => {
                    console.log('📊 [Download Controller] Download progress:', status);
                }
            );

            if (result.success) {
                console.log('✅ [Download Controller] AIS downloaded successfully:', result.filePath);
                return {
                    success: true,
                    filePath: result.filePath,
                    message: 'AIS downloaded successfully'
                };
            } else {
                console.error('❌ [Download Controller] AIS download failed:', result.message);
                return {
                    success: false,
                    message: result.message || 'Download failed'
                };
            }
        } catch (error: any) {
            console.error('❌ [Download Controller] Error downloading AIS:', error);
            return {
                success: false,
                message: error.message || 'Unknown error occurred'
            };
        }
    });

    ipcMain.handle('download:get-path', async (_, pan: string) => {
        const downloadsDir = path.join(app.getPath('downloads'), 'TaxYatra', '26AS', pan);
        return downloadsDir;
    });
}
