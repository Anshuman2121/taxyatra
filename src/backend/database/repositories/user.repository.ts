import { Database } from 'sqlite3';
import { BaseRepository } from './base.repository';
import { User, BankAccount, Jurisdiction } from '../../../shared/types';

export class UserRepository extends BaseRepository {
  constructor(db: Database) {
    super(db);
  }

  async createTables(): Promise<void> {
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
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
      )`,
      `CREATE TABLE IF NOT EXISTS bank_accounts (
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
      )`,
      `CREATE TABLE IF NOT EXISTS jurisdiction (
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
      )`
    ];

    for (const sql of tables) {
      await this.runQuery(sql);
    }
  }

  async saveUser(user: User): Promise<void> {
    const sql = `INSERT OR REPLACE INTO users 
      (pan, firstName, lastName, fullName, mobileNo, email, addrLine1Txt, addrLine2Txt, 
       addrLine3Txt, addrLine4Txt, pinCd, stateCd, aadhaarNum, dateOfBirth, dob, 
       userGender, userType, role, panStatus, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;
    
    await this.runQuery(sql, [
      user.pan, user.firstName, user.lastName, user.fullName, user.mobileNo,
      user.email, user.addrLine1Txt, user.addrLine2Txt, user.addrLine3Txt,
      user.addrLine4Txt, user.pinCd, user.stateCd, user.aadhaarNum,
      user.dateOfBirth, user.dob, user.userGender, user.userType,
      user.role, user.panStatus
    ]);
  }

  async getUserByPan(pan: string): Promise<User | null> {
    return this.getOne<User>('SELECT * FROM users WHERE pan = ?', [pan]);
  }

  async saveBankAccounts(pan: string, accounts: BankAccount[]): Promise<void> {
    await this.runQuery('DELETE FROM bank_accounts WHERE pan = ?', [pan]);
    
    const sql = `INSERT INTO bank_accounts 
      (pan, bankAcctNum, ifscCd, bankName, bankBrnchTxt, nameAsPerBank, 
       accountType, status, submitDt, validDt, refundFlag, accountStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    for (const account of accounts) {
      await this.runQuery(sql, [
        pan, account.bankAcctNum, account.ifscCd, account.bankName,
        account.bankBrnchTxt, account.nameAsPerBank, account.accountType,
        account.status, account.submitDt, account.validDt,
        account.refundFlag, account.accountStatus
      ]);
    }
  }

  async getBankAccountsByPan(pan: string): Promise<BankAccount[]> {
    return this.getAll<BankAccount>('SELECT * FROM bank_accounts WHERE pan = ?', [pan]);
  }

  async saveJurisdiction(jurisdiction: Jurisdiction): Promise<void> {
    const sql = `INSERT OR REPLACE INTO jurisdiction 
      (pan, areaCd, areaDesc, aoType, rangeCd, aoNo, aoPplrName, 
       aoEmailId, aoBldgId, aoBldgDesc, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;
    
    await this.runQuery(sql, [
      jurisdiction.pan, jurisdiction.areaCd, jurisdiction.areaDesc,
      jurisdiction.aoType, jurisdiction.rangeCd, jurisdiction.aoNo,
      jurisdiction.aoPplrName, jurisdiction.aoEmailId, jurisdiction.aoBldgId,
      jurisdiction.aoBldgDesc
    ]);
  }

  async getJurisdictionByPan(pan: string): Promise<Jurisdiction | null> {
    return this.getOne<Jurisdiction>('SELECT * FROM jurisdiction WHERE pan = ?', [pan]);
  }
}
