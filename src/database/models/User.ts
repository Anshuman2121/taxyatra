import { Database } from 'sqlite3';

export interface User {
  pan: string; // Primary key
  firstName: string;
  lastName: string;
  fullName: string;
  mobileNo: string;
  email: string;
  addrLine1Txt: string;
  addrLine2Txt: string;
  addrLine3Txt: string;
  addrLine4Txt: string;
  pinCd: number;
  stateCd: string;
  aadhaarNum: string;
  dateOfBirth: number;
  dob: string;
  userGender: string;
  userType: string;
  role: string;
  panStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankAccount {
  pan: string; // Foreign key
  bankAcctNum: string;
  ifscCd: string;
  bankName: string;
  bankBrnchTxt: string;
  nameAsPerBank: string;
  accountType: string;
  status: string;
  submitDt: number;
  validDt: number;
  refundFlag: string;
  accountStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface Jurisdiction {
  pan: string; // Primary key
  areaCd: string;
  areaDesc: string;
  aoType: string;
  rangeCd: string;
  aoNo: string;
  aoPplrName: string;
  aoEmailId: string;
  aoBldgId: string;
  aoBldgDesc: string;
  createdAt: string;
  updatedAt: string;
}

export class UserModel {
  constructor(private db: Database) {}

  async createTables(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Users table
        this.db.run(`
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

        // Bank accounts table
        this.db.run(`
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

        // Jurisdiction table
        this.db.run(`
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
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  async saveUser(userData: Partial<User>): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO users (
          pan, firstName, lastName, fullName, mobileNo, email,
          addrLine1Txt, addrLine2Txt, addrLine3Txt, addrLine4Txt,
          pinCd, stateCd, aadhaarNum, dateOfBirth, dob,
          userGender, userType, role, panStatus, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      this.db.run(sql, [
        userData.pan,
        userData.firstName,
        userData.lastName,
        userData.fullName,
        userData.mobileNo,
        userData.email,
        userData.addrLine1Txt,
        userData.addrLine2Txt,
        userData.addrLine3Txt,
        userData.addrLine4Txt,
        userData.pinCd,
        userData.stateCd,
        userData.aadhaarNum,
        userData.dateOfBirth,
        userData.dob,
        userData.userGender,
        userData.userType,
        userData.role,
        userData.panStatus
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async saveBankAccounts(pan: string, bankAccounts: Partial<BankAccount>[]): Promise<void> {
    return new Promise((resolve, reject) => {
      // First delete existing bank accounts for this PAN
      this.db.run('DELETE FROM bank_accounts WHERE pan = ?', [pan], (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Insert new bank accounts
        const sql = `
          INSERT INTO bank_accounts (
            pan, bankAcctNum, ifscCd, bankName, bankBrnchTxt,
            nameAsPerBank, accountType, status, submitDt, validDt,
            refundFlag, accountStatus
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        let completed = 0;
        const total = bankAccounts.length;

        if (total === 0) {
          resolve();
          return;
        }

        bankAccounts.forEach((account) => {
          this.db.run(sql, [
            pan,
            account.bankAcctNum,
            account.ifscCd,
            account.bankName,
            account.bankBrnchTxt,
            account.nameAsPerBank,
            account.accountType,
            account.status,
            account.submitDt,
            account.validDt,
            account.refundFlag,
            account.accountStatus
          ], (err) => {
            if (err) {
              reject(err);
              return;
            }
            completed++;
            if (completed === total) {
              resolve();
            }
          });
        });
      });
    });
  }

  async saveJurisdiction(jurisdictionData: Partial<Jurisdiction>): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO jurisdiction (
          pan, areaCd, areaDesc, aoType, rangeCd, aoNo,
          aoPplrName, aoEmailId, aoBldgId, aoBldgDesc, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      this.db.run(sql, [
        jurisdictionData.pan,
        jurisdictionData.areaCd,
        jurisdictionData.areaDesc,
        jurisdictionData.aoType,
        jurisdictionData.rangeCd,
        jurisdictionData.aoNo,
        jurisdictionData.aoPplrName,
        jurisdictionData.aoEmailId,
        jurisdictionData.aoBldgId,
        jurisdictionData.aoBldgDesc
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async getUserByPan(pan: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM users WHERE pan = ?', [pan], (err, row) => {
        if (err) reject(err);
        else resolve(row as User || null);
      });
    });
  }

  async getBankAccountsByPan(pan: string): Promise<BankAccount[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM bank_accounts WHERE pan = ?', [pan], (err, rows) => {
        if (err) reject(err);
        else resolve(rows as BankAccount[]);
      });
    });
  }

  async getJurisdictionByPan(pan: string): Promise<Jurisdiction | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM jurisdiction WHERE pan = ?', [pan], (err, row) => {
        if (err) reject(err);
        else resolve(row as Jurisdiction || null);
      });
    });
  }
}
