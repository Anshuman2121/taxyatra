import { Database } from 'sqlite3';
import { BaseRepository } from './base.repository';

export class AuthRepository extends BaseRepository {
  constructor(db: Database) {
    super(db);
  }

  async createTables(): Promise<void> {
    const tables = [
      `CREATE TABLE IF NOT EXISTS registration (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        activation_code TEXT NOT NULL,
        is_activated BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS pan_credentials (
        pan TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const sql of tables) {
      await this.runQuery(sql);
    }
  }

  async isActivated(): Promise<boolean> {
    const result = await this.getOne<{ is_activated: number }>(
      'SELECT is_activated FROM registration WHERE is_activated = 1 LIMIT 1'
    );
    return !!result;
  }

  async saveActivationCode(code: string): Promise<void> {
    await this.runQuery(
      'INSERT INTO registration (activation_code, is_activated) VALUES (?, 1)',
      [code]
    );
  }

  async savePanCredentials(pan: string, password: string): Promise<void> {
    await this.runQuery(
      'INSERT OR REPLACE INTO pan_credentials (pan, password, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
      [pan, password]
    );
  }

  async getAllPanCredentials(): Promise<Array<{ pan: string; created_at: string }>> {
    return this.getAll('SELECT pan, created_at FROM pan_credentials ORDER BY created_at DESC');
  }

  async getPanWithPassword(pan: string): Promise<{ pan: string; password: string } | null> {
    return this.getOne('SELECT pan, password FROM pan_credentials WHERE pan = ?', [pan]);
  }
}
