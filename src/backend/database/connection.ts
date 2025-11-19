import { Database } from 'sqlite3';
import fs from 'fs';
import { getDatabasePath, getEncryptedDatabasePath } from '../config/database.config';
import { encryptData, decryptData } from './encryption';

let db: Database;

export const initDatabase = (): Promise<Database> => {
  return new Promise((resolve, reject) => {
    const dbPath = getDatabasePath();
    const encryptedDbPath = getEncryptedDatabasePath();
    
    // Remove corrupted encrypted file
    if (fs.existsSync(encryptedDbPath)) {
      fs.unlinkSync(encryptedDbPath);
    }
    
    db = new Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(db);
    });
  });
};

export const getDatabase = (): Database => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};

export const closeDatabase = (): void => {
  if (db) {
    const dbPath = getDatabasePath();
    const encryptedDbPath = getEncryptedDatabasePath();
    
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
        return;
      }

      try {
        if (fs.existsSync(dbPath)) {
          const dbData = fs.readFileSync(dbPath, 'binary');
          const encryptedData = encryptData(dbData);
          fs.writeFileSync(encryptedDbPath, encryptedData);
          fs.unlinkSync(dbPath);
        }
      } catch (error) {
        console.error('Failed to encrypt database:', error);
      }
    });
  }
};
