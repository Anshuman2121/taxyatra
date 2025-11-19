import { getDatabase } from '../connection';

const VALID_ACTIVATION_CODE = '12345678';

export async function isAppActivated(): Promise<boolean> {
    const pool = getDatabase();
    if (!pool) {
        console.error("Database not initialized");
        return false;
    }

    try {
        const res = await pool.query('SELECT COUNT(*) as count FROM "registration" WHERE "is_activated" = true');
        return res.rows[0].count > 0;
    } catch (err) {
        console.error("Error checking activation", err);
        return false;
    }
}

export async function validateAndStoreActivationCode(code: string): Promise<boolean> {
    if (code !== VALID_ACTIVATION_CODE) {
        return false;
    }

    const pool = getDatabase();
    if (!pool) {
        return false;
    }

    try {
        await pool.query('INSERT INTO "registration" ("activation_code") VALUES ($1)', [code]);
        return true;
    } catch (err) {
        console.error("Error storing activation code", err);
        return false;
    }
}
