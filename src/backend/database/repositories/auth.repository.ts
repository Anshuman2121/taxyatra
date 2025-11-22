import { getDatabase } from '../connection';

const VALID_ACTIVATION_CODE = '12345678';

export async function isAppActivated(): Promise<boolean> {
    const db = getDatabase();
    if (!db) {
        console.error("Database not initialized");
        return false;
    }

    try {
        const result = db.prepare('SELECT COUNT(*) as count FROM "registration" WHERE "is_activated" = 1').get() as { count: number };
        return result.count > 0;
    } catch (err) {
        console.error("Error checking activation", err);
        return false;
    }
}

export async function validateAndStoreActivationCode(code: string): Promise<boolean> {
    if (code !== VALID_ACTIVATION_CODE) {
        return false;
    }

    const db = getDatabase();
    if (!db) {
        return false;
    }

    try {
        db.prepare('INSERT INTO "registration" ("activation_code") VALUES (?)').run(code);
        return true;
    } catch (err) {
        console.error("Error storing activation code", err);
        return false;
    }
}
