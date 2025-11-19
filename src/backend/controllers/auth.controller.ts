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

    ipcMain.handle('save-pan-credentials', (_, pan: string, password: string) => {
        try {
            const db = getDatabase();
            db.run('INSERT OR REPLACE INTO pan_credentials (pan, password, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
                [pan, password], (err) => {
                    if (err) {
                        console.error('Error saving PAN credentials:', err);
                    }
                });
            return true;
        } catch (error) {
            console.error('Error saving PAN credentials:', error);
            return false;
        }
    });

    ipcMain.handle('get-pan-credentials', () => {
        return new Promise((resolve, reject) => {
            try {
                const db = getDatabase();
                db.all('SELECT pan, created_at FROM pan_credentials ORDER BY created_at DESC', (err, rows) => {
                    if (err) {
                        console.error('Error getting PAN credentials:', err);
                        resolve([]);
                    } else {
                        resolve(rows);
                    }
                });
            } catch (error) {
                console.error('Error getting PAN credentials:', error);
                resolve([]);
            }
        });
    });

    ipcMain.handle('get-pan-with-password', (_, pan: string) => {
        return new Promise((resolve, reject) => {
            try {
                const db = getDatabase();
                db.get('SELECT pan, password FROM pan_credentials WHERE pan = ?', [pan], (err, row) => {
                    if (err) {
                        console.error('Error getting PAN with password:', err);
                        resolve(null);
                    } else {
                        resolve(row);
                    }
                });
            } catch (error) {
                console.error('Error getting PAN with password:', error);
                resolve(null);
            }
        });
    });
}
