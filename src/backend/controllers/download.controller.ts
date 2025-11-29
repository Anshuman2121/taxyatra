import { ipcMain, app } from 'electron';
import path from 'path';
import fs from 'fs';
import playwrightService from '../services/playwright.service';

export function registerDownloadHandlers() {
    ipcMain.handle('download:26as', async (event, pan: string, password: string, assessmentYear: string) => {
        console.log('📥 [Download Controller] 26AS download requested for PAN:', pan, 'AY:', assessmentYear);

        try {
            // Create download directory: /Downloads/TaxYatra/{PAN}/{AssessmentYear}/26AS/
            const downloadsDir = path.join(
                app.getPath('downloads'),
                'TaxYatra',
                pan,
                assessmentYear,
                '26AS'
            );

            if (!fs.existsSync(downloadsDir)) {
                fs.mkdirSync(downloadsDir, { recursive: true });
                console.log('📁 [Download Controller] Created download directory:', downloadsDir);
            }

            // Download 26AS (login happens within the same browser session)
            console.log('📥 [Download Controller] Starting 26AS download with login...');
            const result = await playwrightService.download26AS(
                pan,
                password,
                assessmentYear,
                downloadsDir,
                event,
                (status: string) => {
                    console.log('📊 [Download Controller] Download progress:', status);
                }
            );

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

    ipcMain.handle('download:ais', async (event, pan: string, password: string, financialYear: string) => {
        console.log('📥 [Download Controller] AIS download requested for PAN:', pan, 'F.Y.:', financialYear);

        try {
            // Create download directory if it doesn't exist - match TIS pattern
            const downloadsDir = path.join(app.getPath('downloads'), 'TaxYatra', pan, financialYear, 'AIS');
            if (!fs.existsSync(downloadsDir)) {
                fs.mkdirSync(downloadsDir, { recursive: true });
                console.log('📁 [Download Controller] Created download directory:', downloadsDir);
            }

            // Download AIS (login happens within the same browser session)
            console.log('📥 [Download Controller] Starting AIS download with login...');
            const result = await playwrightService.downloadAIS(
                pan,
                password,
                financialYear,
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

    ipcMain.handle('download:tis', async (event, pan: string, password: string, financialYear: string) => {
        console.log('📥 [Download Controller] TIS download requested for PAN:', pan, 'F.Y.:', financialYear);

        try {
            // Create download directory: /Downloads/TaxYatra/{PAN}/{AssessmentYear}/TIS/
            // Convert F.Y. to Assessment Year (e.g., "2024-25" -> "2025-26")
            const [startYear, endYear] = financialYear.split('-');
            const assessmentYear = `20${endYear}-${(parseInt(endYear) + 1).toString().padStart(2, '0')}`;

            const downloadsDir = path.join(
                app.getPath('downloads'),
                'TaxYatra',
                pan,
                assessmentYear,
                'TIS'
            );

            if (!fs.existsSync(downloadsDir)) {
                fs.mkdirSync(downloadsDir, { recursive: true });
                console.log('📁 [Download Controller] Created download directory:', downloadsDir);
            }

            // Download TIS (login happens within the same browser session)
            console.log('📥 [Download Controller] Starting TIS download with login...');
            const result = await playwrightService.downloadTIS(
                pan,
                password,
                financialYear,
                downloadsDir,
                event,
                (status: string) => {
                    console.log('📊 [Download Controller] Download progress:', status);
                }
            );

            if (result.success) {
                console.log('✅ [Download Controller] TIS downloaded successfully:', result.filePath);
                return {
                    success: true,
                    filePath: result.filePath,
                    message: 'TIS downloaded successfully'
                };
            } else {
                console.error('❌ [Download Controller] TIS download failed:', result.message);
                return {
                    success: false,
                    message: result.message || 'Download failed'
                };
            }
        } catch (error: any) {
            console.error('❌ [Download Controller] Error downloading TIS:', error);
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
