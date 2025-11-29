import { ipcMain } from 'electron';
import playwrightService from '../services/playwright.service';
import userDataService from '../services/userDataService';
import { ITRRepository } from '../database/repositories/itr.repository';
import { getDatabase, isDatabaseOpen } from '../database/connection';

export function registerUserHandlers() {
    ipcMain.handle('fetch-user-profile', async (event, pan: string, password: string, save: boolean = true) => {
        console.log('🚀 [User Controller] Fetch started for PAN:', pan, 'Save:', save);
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

                    const result = await playwrightService.login(pan, password, sendProgress);

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

                            // Extract assessment year from prefill data or use default
                            const assessmentYear = prefillData.filingStatus?.assessmentYear || '2025';

                            let returnId = null;

                            if (save) {
                                sendProgress('💾 Saving data to database...');

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
                                returnId = await itrRepository.savePrefillData(pan, assessmentYear, prefillData);

                                sendProgress('✅ Profile data saved successfully!');
                                console.log('🎉 [User Controller] Complete - Return ID:', returnId);
                            } else {
                                sendProgress('✅ Profile data fetched (Preview Mode)');
                                console.log('🎉 [User Controller] Fetch Complete (Preview Mode)');
                            }

                            // Logout to clean up session
                            try {
                                sendProgress('🚪 Logging out...');
                                await playwrightService.logout(result.cookies);
                                console.log('✅ [User Controller] Logged out successfully');
                            } catch (logoutError) {
                                console.log('⚠️ [User Controller] Logout failed (non-critical):', logoutError);
                                // Don't fail the whole operation if logout fails
                            }

                            return {
                                success: true,
                                data: prefillData,
                                returnId: returnId,
                                message: save ? `Data saved for AY ${assessmentYear}` : 'Data fetched successfully'
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
            const userData = await userDataService.getUserData(pan);

            if (userData && userData.user) {
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

    ipcMain.handle('get-all-users', async () => {
        console.log('🔍 [User Controller] Fetching all users');
        try {
            const users = await userDataService.getAllUsers();
            return { success: true, data: users };
        } catch (error: any) {
            console.error('❌ [User Controller] Error fetching all users:', error.message);
            return { success: false, message: error.message };
        }
    });

    ipcMain.handle('save-fetched-profile', async (event, data: any) => {
        console.log('💾 [User Controller] Saving fetched profile data for PAN:', data.pan);
        try {
            const sendProgress = (status: string) => {
                event.sender.send('fetch-progress', status);
            };

            if (!isDatabaseOpen()) {
                return { success: false, message: 'Database is not available' };
            }

            const db = getDatabase();
            if (!db) {
                return { success: false, message: 'Database not initialized' };
            }

            sendProgress('💾 Saving data to database...');

            // We need to use ITRRepository to save the prefill data structure
            const itrRepository = new ITRRepository(db);

            // Extract assessment year or default
            const assessmentYear = data.filingStatus?.assessmentYear || '2025';

            const returnId = await itrRepository.savePrefillData(data.pan, assessmentYear, data);

            sendProgress('✅ Profile data saved successfully!');
            console.log('🎉 [User Controller] Save Complete - Return ID:', returnId);

            return { success: true, message: 'Data saved successfully', returnId };
        } catch (error: any) {
            console.error('❌ [User Controller] Error saving fetched data:', error.message);
            return { success: false, message: error.message };
        }
    });

    ipcMain.handle('update-user-details', async (event, data: any) => {
        console.log('📝 [User Controller] Updating user details for PAN:', data.pan);
        try {
            // We need to implement update logic. 
            // Since we moved to ITRRepository for saving, we should ideally use that or UserModel.
            // But ITRRepository expects a specific structure (PrefillData).
            // For manual edits, we might receive a flatter structure.
            // Let's use UserModel directly for manual updates as it handles partial updates better.

            const db = getDatabase();
            if (!db) {
                return { success: false, message: 'Database not initialized' };
            }

            const { UserModel } = await import('../database/repositories/user.repository');
            const userModel = new UserModel(db);

            // Save User (Person + Address)
            if (data.user) {
                await userModel.saveUser(data.user);
            }

            // Save Bank Accounts
            if (data.bankAccounts) {
                await userModel.saveBankAccounts(data.pan, data.bankAccounts);
            }

            // Save Jurisdiction
            if (data.jurisdiction) {
                await userModel.saveJurisdiction(data.jurisdiction);
            }

            return { success: true, message: 'User details updated successfully' };
        } catch (error: any) {
            console.error('❌ [User Controller] Error updating user details:', error.message);
            return { success: false, message: error.message };
        }
    });

    ipcMain.handle('delete-user', async (event, pan: string) => {
        console.log('🗑️ [User Controller] Deleting user:', pan);
        try {
            await userDataService.deleteUser(pan);
            return { success: true, message: 'User deleted successfully' };
        } catch (error: any) {
            console.error('❌ [User Controller] Error deleting user:', error.message);
            return { success: false, message: error.message };
        }
    });
}
