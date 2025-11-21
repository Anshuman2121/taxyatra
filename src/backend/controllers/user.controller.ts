import { ipcMain } from 'electron';
import puppeteerService from '../services/puppeteer.service';
import userDataService from '../services/userDataService';
import { ITRRepository } from '../database/repositories/itr.repository';
import { getDatabase, isDatabaseOpen } from '../database/connection';

export function registerUserHandlers() {
    ipcMain.handle('fetch-user-profile', async (event, pan: string, password: string) => {
        console.log('🚀 [User Controller] Fetch started for PAN:', pan);
        try {
            const sendProgress = (status: string) => {
                event.sender.send('fetch-progress', status);
            };

            const maxRetries = 3;
            let lastError: any = null;

            // Retry login up to maxRetries times if AuthToken not captured
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    if (attempt > 1) {
                        console.log(`🔄 [User Controller] Retry attempt ${attempt}/${maxRetries}`);
                        sendProgress(`🔄 Retrying login (attempt ${attempt}/${maxRetries})...`);
                    } else {
                        sendProgress('🔐 Logging in...');
                    }

                    const result = await puppeteerService.login(pan, password, sendProgress);

                    if (result.success) {
                        // Check if AuthToken was captured
                        const hasAuthToken = result.cookies?.some((c: any) => c.name === 'AuthToken');

                        if (!hasAuthToken && attempt < maxRetries) {
                            console.log(`⚠️ [User Controller] AuthToken not captured on attempt ${attempt}, retrying...`);
                            sendProgress(`⚠️ AuthToken not captured, retrying...`);
                            continue; // Retry
                        }

                        if (!hasAuthToken) {
                            console.log(`❌ [User Controller] AuthToken not captured after ${maxRetries} attempts`);
                            return {
                                success: false,
                                message: `Login succeeded but AuthToken not captured after ${maxRetries} attempts. Please try again.`
                            };
                        }

                        // AuthToken captured successfully, proceed with data fetch
                        console.log(`✅ [User Controller] AuthToken captured on attempt ${attempt}`);

                        try {
                            sendProgress('📊 Fetching prefill data...');
                            const ITRApiService = (await import('../services/api')).default;
                            const prefillData = await ITRApiService.fetchAllUserData(pan, password, result.cookies);

                            sendProgress('💾 Saving data to database...');
                            // Extract assessment year from prefill data or use default
                            const assessmentYear = prefillData.filingStatus?.assessmentYear || '2025';

                            // Check database state before saving
                            if (!isDatabaseOpen()) {
                                console.error('❌ [User Controller] Database is closed or closing');
                                return { success: false, message: 'Database is not available' };
                            }

                            // Save to database using ITR repository
                            const db = getDatabase();
                            if (!db) {
                                console.error('❌ [User Controller] Database not initialized');
                                return { success: false, message: 'Database not initialized' };
                            }
                            
                            const itrRepository = new ITRRepository(db);
                            const returnId = await itrRepository.savePrefillData(pan, assessmentYear, prefillData);

                            sendProgress('✅ Profile data saved successfully!');
                            console.log('🎉 [User Controller] Complete - Return ID:', returnId);

                            // Logout to clean up session
                            try {
                                sendProgress('🚪 Logging out...');
                                await puppeteerService.logout(result.cookies);
                                console.log('✅ [User Controller] Logged out successfully');
                            } catch (logoutError) {
                                console.log('⚠️ [User Controller] Logout failed (non-critical):', logoutError);
                                // Don't fail the whole operation if logout fails
                            }

                            return {
                                success: true,
                                data: prefillData,
                                returnId: returnId,
                                message: `Data saved for AY ${assessmentYear}`
                            };
                        } catch (apiError: any) {
                            console.error('❌ [User Controller] Error:', apiError.message);
                            sendProgress('❌ ' + apiError.message);
                            return { success: false, message: apiError.message };
                        }
                    }

                    // Login failed
                    lastError = result.message || 'Login failed';
                    if (attempt < maxRetries) {
                        console.log(`⚠️ [User Controller] Login failed on attempt ${attempt}, retrying...`);
                        sendProgress(`⚠️ Login failed, retrying...`);
                        continue; // Retry
                    }
                } catch (error: any) {
                    lastError = error.message;
                    if (attempt < maxRetries) {
                        console.log(`⚠️ [User Controller] Error on attempt ${attempt}: ${error.message}, retrying...`);
                        sendProgress(`⚠️ Error occurred, retrying...`);
                        continue; // Retry
                    }
                }
            }

            // All retries exhausted
            console.error(`❌ [User Controller] All ${maxRetries} attempts failed`);
            return { success: false, message: lastError || 'Login failed after multiple attempts' };
        } catch (error: any) {
            console.error('❌ [User Controller] Fatal error:', error.message);
            event.sender.send('fetch-progress', '❌ ' + error.message);
            return { success: false, message: error.message || 'An error occurred' };
        }
    });

    ipcMain.handle('get-user-data', async (event, pan: string) => {
        console.log('🔍 [User Controller] Fetching stored data for PAN:', pan);
        try {
            if (!isDatabaseOpen()) {
                console.log('⚠️  [User Controller] Database is closed or closing');
                return { success: false, message: 'Database is not available' };
            }
            
            const db = getDatabase();
            if (!db) {
                console.error('❌ [User Controller] Database not initialized');
                return { success: false, message: 'Database not initialized' };
            }
            
            const itrRepository = new ITRRepository(db);
            const userData = await itrRepository.getUserData(pan);

            if (userData) {
                console.log('✅ [User Controller] Data found for PAN:', pan);
                return { success: true, data: userData };
            } else {
                console.log('⚠️ [User Controller] No data found for PAN:', pan);
                return { success: false, message: 'No data found' };
            }
        } catch (error: any) {
            console.error('❌ [User Controller] Error fetching stored data:', error.message);
            return { success: false, message: error.message };
        }
    });
}
