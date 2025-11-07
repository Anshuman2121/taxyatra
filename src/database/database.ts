import { Database } from 'sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { encryptData, decryptData } from './encryption';

let db: Database;
const DB_FILE = 'taxyatra.db';
const ENCRYPTED_DB_FILE = 'taxyatra.enc';

export function initDatabase(): Promise<Database> {
  return new Promise((resolve, reject) => {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, DB_FILE);
    const encryptedDbPath = path.join(userDataPath, ENCRYPTED_DB_FILE);
    
    // Load encrypted database if exists
    if (fs.existsSync(encryptedDbPath)) {
      try {
        const encryptedData = fs.readFileSync(encryptedDbPath, 'utf8');
        const decryptedData = decryptData(encryptedData);
        fs.writeFileSync(dbPath, decryptedData, 'binary');
      } catch (error) {
        console.error('Failed to decrypt database:', error);
      }
    }
    
    db = new Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Create all tables
      db.serialize(() => {
        // Create registration table
        db.run(`
          CREATE TABLE IF NOT EXISTS registration (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            activation_code TEXT NOT NULL,
            is_activated BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Create inventory table
        db.run(`
          CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            status TEXT NOT NULL,
            pan TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Create pan_credentials table
        db.run(`
          CREATE TABLE IF NOT EXISTS pan_credentials (
            pan TEXT PRIMARY KEY,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Create users table
        db.run(`
          CREATE TABLE IF NOT EXISTS users (
            pan TEXT PRIMARY KEY,
            firstName TEXT,
            lastName TEXT,
            fullName TEXT,
            mobileNo TEXT,
            email TEXT,
            addrLine1Txt TEXT,
            addrLine2Txt TEXT,
            addrLine3Txt TEXT,
            addrLine4Txt TEXT,
            pinCd INTEGER,
            stateCd TEXT,
            aadhaarNum TEXT,
            dateOfBirth INTEGER,
            dob TEXT,
            userGender TEXT,
            userType TEXT,
            role TEXT,
            panStatus TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Create bank accounts table
        db.run(`
          CREATE TABLE IF NOT EXISTS bank_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pan TEXT,
            bankAcctNum TEXT,
            ifscCd TEXT,
            bankName TEXT,
            bankBrnchTxt TEXT,
            nameAsPerBank TEXT,
            accountType TEXT,
            status TEXT,
            submitDt INTEGER,
            validDt INTEGER,
            refundFlag TEXT,
            accountStatus TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pan) REFERENCES users (pan)
          )
        `);

        // Create jurisdiction table
        db.run(`
          CREATE TABLE IF NOT EXISTS jurisdiction (
            pan TEXT PRIMARY KEY,
            areaCd TEXT,
            areaDesc TEXT,
            aoType TEXT,
            rangeCd TEXT,
            aoNo TEXT,
            aoPplrName TEXT,
            aoEmailId TEXT,
            aoBldgId TEXT,
            aoBldgDesc TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pan) REFERENCES users (pan)
          )
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(db);
          }
        });
      });
    });
  });
}

export function getDatabase(): Database {
  return db;
}

export function closeDatabase(): void {
  if (db) {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, DB_FILE);
    const encryptedDbPath = path.join(userDataPath, ENCRYPTED_DB_FILE);
    
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
        return;
      }

      // Encrypt and save database
      try {
        if (fs.existsSync(dbPath)) {
          const dbData = fs.readFileSync(dbPath, 'binary');
          const encryptedData = encryptData(dbData);
          fs.writeFileSync(encryptedDbPath, encryptedData);
          
          // Remove unencrypted file
          fs.unlinkSync(dbPath);
        }
      } catch (error) {
        console.error('Failed to encrypt database:', error);
      }
    });
  }
}
