import { getDatabase } from '../connection';

const VALID_ACTIVATION_CODE = '12345678';

export function isAppActivated(): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const db = getDatabase();
        if (!db) {
            console.error("Database not initialized");
            resolve(false);
            return;
        }

        db.get('SELECT COUNT(*) as count FROM registration WHERE is_activated = 1', (err, row: { count: number }) => {
            if (err) {
                console.error("Error checking activation", err);
                resolve(false);
            } else {
                resolve(row && row.count > 0);
            }
        });
    });
}

export function validateAndStoreActivationCode(code: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        if (code !== VALID_ACTIVATION_CODE) {
            resolve(false);
            return;
        }

        const db = getDatabase();
        if (!db) {
            resolve(false);
            return;
        }

        db.run('INSERT INTO registration (activation_code) VALUES (?)', [code], (err) => {
            if (err) {
                console.error("Error storing activation code", err);
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}
