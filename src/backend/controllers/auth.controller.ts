import { ipcMain } from 'electron';
import { isAppActivated, validateAndStoreActivationCode } from '../database/repositories/auth.repository';
import { getDatabase, isDatabaseOpen } from '../database/connection';

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
            if (!isDatabaseOpen()) {
                console.log('⚠️  [Auth Controller] Database is closed or closing');
                return false;
            }
            
            const db = getDatabase();
            if (!db) {
                console.error('❌ [Auth Controller] Database not initialized');
                return false;
            }

            const stmt = db.prepare(`
                INSERT INTO "pan_credentials" ("pan", "password", "updated_at") 
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT ("pan") DO UPDATE SET 
                "password" = excluded."password", 
                "updated_at" = CURRENT_TIMESTAMP
            `);
            stmt.run(pan, password);
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
            if (!isDatabaseOpen()) {
                console.log('⚠️  [Auth Controller] Database is closed or closing');
                return [];
            }
            
            const db = getDatabase();
            if (!db) {
                console.error('❌ [Auth Controller] Database not initialized');
                return [];
            }

            const stmt = db.prepare('SELECT "pan", "created_at" FROM "pan_credentials" ORDER BY "created_at" DESC');
            const rows = stmt.all();
            console.log('✅ [Auth Controller] Found', rows.length, 'PAN credential(s)');
            return rows;
        } catch (error) {
            console.error('❌ [Auth Controller] Error getting PAN credentials:', error);
            return [];
        }
    });

    ipcMain.handle('get-pan-with-password', async (_, pan: string) => {
        console.log('🔍 [Auth Controller] Fetching credentials for PAN:', pan);
        try {
            if (!isDatabaseOpen()) {
                console.log('⚠️  [Auth Controller] Database is closed or closing');
                return null;
            }
            
            const db = getDatabase();
            if (!db) {
                console.error('❌ [Auth Controller] Database not initialized');
                return null;
            }

            const stmt = db.prepare('SELECT "pan", "password" FROM "pan_credentials" WHERE "pan" = ?');
            const row = stmt.get(pan);
            if (row) {
                console.log('✅ [Auth Controller] Credentials found for PAN:', pan);
            } else {
                console.log('⚠️  [Auth Controller] No credentials found for PAN:', pan);
            }
            return row || null;
        } catch (error) {
            console.error('❌ [Auth Controller] Error getting PAN with password:', error);
            return null;
        }
    });
}
