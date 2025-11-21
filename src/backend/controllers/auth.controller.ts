import { ipcMain } from 'electron';
import { isAppActivated, validateAndStoreActivationCode } from '../database/repositories/auth.repository';
import { getDatabase } from '../database/connection';

export function registerAuthHandlers() {
    ipcMain.handle('check-activation', async () => {
        console.log('🔍 [Auth Controller] Checking app activation status...');
        try {
            const isActivated = await isAppActivated();
            console.log('✅ [Auth Controller] Activation status:', isActivated ? 'ACTIVATED' : 'NOT ACTIVATED');
            return isActivated;
        } catch (error) {
            console.error('❌ [Auth Controller] Error checking activation:', error);
            return false;
        }
    });

    ipcMain.handle('validate-activation-code', async (_, code: string) => {
        console.log('🔑 [Auth Controller] Validating activation code...');
        try {
            const isValid = await validateAndStoreActivationCode(code);
            console.log(isValid ? '✅ [Auth Controller] Activation code valid' : '❌ [Auth Controller] Activation code invalid');
            return isValid;
        } catch (error) {
            console.error('❌ [Auth Controller] Error validating activation code:', error);
            return false;
        }
    });

    ipcMain.handle('save-pan-credentials', async (_, pan: string, password: string) => {
        console.log('💾 [Auth Controller] Saving PAN credentials...');
        console.log('🔑 PAN:', pan);
        try {
            const pool = getDatabase();
            if (!pool) {
                console.error('❌ [Auth Controller] Database not initialized');
                return false;
            }

            await pool.query(`
                INSERT INTO "pan_credentials" ("pan", "password", "updated_at") 
                VALUES ($1, $2, CURRENT_TIMESTAMP)
                ON CONFLICT ("pan") DO UPDATE SET 
                "password" = EXCLUDED."password", 
                "updated_at" = CURRENT_TIMESTAMP
            `, [pan, password]);
            console.log('✅ [Auth Controller] PAN credentials saved successfully');
            return true;
        } catch (error) {
            console.error('❌ [Auth Controller] Error saving PAN credentials:', error);
            return false;
        }
    });

    ipcMain.handle('get-pan-credentials', async () => {
        console.log('📊 [Auth Controller] Fetching all PAN credentials...');
        try {
            const pool = getDatabase();
            if (!pool) {
                console.error('❌ [Auth Controller] Database not initialized');
                return [];
            }

            const res = await pool.query('SELECT "pan", "created_at" FROM "pan_credentials" ORDER BY "created_at" DESC');
            console.log('✅ [Auth Controller] Found', res.rows.length, 'PAN credential(s)');
            return res.rows;
        } catch (error) {
            console.error('❌ [Auth Controller] Error getting PAN credentials:', error);
            return [];
        }
    });

    ipcMain.handle('get-pan-with-password', async (_, pan: string) => {
        console.log('🔍 [Auth Controller] Fetching credentials for PAN:', pan);
        try {
            const pool = getDatabase();
            if (!pool) {
                console.error('❌ [Auth Controller] Database not initialized');
                return null;
            }

            const res = await pool.query('SELECT "pan", "password" FROM "pan_credentials" WHERE "pan" = $1', [pan]);
            if (res.rows[0]) {
                console.log('✅ [Auth Controller] Credentials found for PAN:', pan);
            } else {
                console.log('⚠️  [Auth Controller] No credentials found for PAN:', pan);
            }
            return res.rows[0] || null;
        } catch (error) {
            console.error('❌ [Auth Controller] Error getting PAN with password:', error);
            return null;
        }
    });
}
