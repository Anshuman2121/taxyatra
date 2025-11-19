import { ipcMain } from 'electron';
import { isAppActivated, validateAndStoreActivationCode } from '../database/repositories/auth.repository';
import { getDatabase } from '../database/connection';

export function registerAuthHandlers() {
    ipcMain.handle('check-activation', async () => {
        try {
            return await isAppActivated();
        } catch (error) {
            console.error('Error checking activation:', error);
            return false;
        }
    });

    ipcMain.handle('validate-activation-code', async (_, code: string) => {
        try {
            return await validateAndStoreActivationCode(code);
        } catch (error) {
            console.error('Error validating activation code:', error);
            return false;
        }
    });

    ipcMain.handle('save-pan-credentials', async (_, pan: string, password: string) => {
        try {
            const pool = getDatabase();
            if (!pool) return false;

            await pool.query(`
                INSERT INTO "pan_credentials" ("pan", "password", "updated_at") 
                VALUES ($1, $2, CURRENT_TIMESTAMP)
                ON CONFLICT ("pan") DO UPDATE SET 
                "password" = EXCLUDED."password", 
                "updated_at" = CURRENT_TIMESTAMP
            `, [pan, password]);
            return true;
        } catch (error) {
            console.error('Error saving PAN credentials:', error);
            return false;
        }
    });

    ipcMain.handle('get-pan-credentials', async () => {
        try {
            const pool = getDatabase();
            if (!pool) return [];

            const res = await pool.query('SELECT "pan", "created_at" FROM "pan_credentials" ORDER BY "created_at" DESC');
            return res.rows;
        } catch (error) {
            console.error('Error getting PAN credentials:', error);
            return [];
        }
    });

    ipcMain.handle('get-pan-with-password', async (_, pan: string) => {
        try {
            const pool = getDatabase();
            if (!pool) return null;

            const res = await pool.query('SELECT "pan", "password" FROM "pan_credentials" WHERE "pan" = $1', [pan]);
            return res.rows[0] || null;
        } catch (error) {
            console.error('Error getting PAN with password:', error);
            return null;
        }
    });
}
