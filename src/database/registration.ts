import { getDatabase } from './database';

const VALID_ACTIVATION_CODE = '12345678';

export function isAppActivated(): boolean {
  const db = getDatabase();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM registration WHERE is_activated = 1');
  const result = stmt.get() as { count: number };
  return result.count > 0;
}

export function validateAndStoreActivationCode(code: string): boolean {
  if (code !== VALID_ACTIVATION_CODE) {
    return false;
  }
  
  const db = getDatabase();
  const stmt = db.prepare('INSERT INTO registration (activation_code) VALUES (?)');
  stmt.run(code);
  return true;
}
