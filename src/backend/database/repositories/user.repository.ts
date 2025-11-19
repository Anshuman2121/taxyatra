import { Pool } from 'pg';

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
  constructor(private pool: Pool) { }

  // createTables removed as it is handled in connection.ts

  async saveUser(userData: Partial<User>): Promise<void> {
    const sql = `
      INSERT INTO "users" (
        "pan", "firstName", "lastName", "fullName", "mobileNo", "email",
        "addrLine1Txt", "addrLine2Txt", "addrLine3Txt", "addrLine4Txt",
        "pinCd", "stateCd", "aadhaarNum", "dateOfBirth", "dob",
        "userGender", "userType", "role", "panStatus", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, CURRENT_TIMESTAMP)
      ON CONFLICT ("pan") DO UPDATE SET
        "firstName" = EXCLUDED."firstName",
        "lastName" = EXCLUDED."lastName",
        "fullName" = EXCLUDED."fullName",
        "mobileNo" = EXCLUDED."mobileNo",
        "email" = EXCLUDED."email",
        "addrLine1Txt" = EXCLUDED."addrLine1Txt",
        "addrLine2Txt" = EXCLUDED."addrLine2Txt",
        "addrLine3Txt" = EXCLUDED."addrLine3Txt",
        "addrLine4Txt" = EXCLUDED."addrLine4Txt",
        "pinCd" = EXCLUDED."pinCd",
        "stateCd" = EXCLUDED."stateCd",
        "aadhaarNum" = EXCLUDED."aadhaarNum",
        "dateOfBirth" = EXCLUDED."dateOfBirth",
        "dob" = EXCLUDED."dob",
        "userGender" = EXCLUDED."userGender",
        "userType" = EXCLUDED."userType",
        "role" = EXCLUDED."role",
        "panStatus" = EXCLUDED."panStatus",
        "updatedAt" = CURRENT_TIMESTAMP
    `;

    await this.pool.query(sql, [
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
    ]);
  }

  async saveBankAccounts(pan: string, bankAccounts: Partial<BankAccount>[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // First delete existing bank accounts for this PAN
      await client.query('DELETE FROM "bank_accounts" WHERE "pan" = $1', [pan]);

      // Insert new bank accounts
      const sql = `
        INSERT INTO "bank_accounts" (
          "pan", "bankAcctNum", "ifscCd", "bankName", "bankBrnchTxt",
          "nameAsPerBank", "accountType", "status", "submitDt", "validDt",
          "refundFlag", "accountStatus"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;

      for (const account of bankAccounts) {
        await client.query(sql, [
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
        ]);
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async saveJurisdiction(jurisdictionData: Partial<Jurisdiction>): Promise<void> {
    const sql = `
      INSERT INTO "jurisdiction" (
        "pan", "areaCd", "areaDesc", "aoType", "rangeCd", "aoNo",
        "aoPplrName", "aoEmailId", "aoBldgId", "aoBldgDesc", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
      ON CONFLICT ("pan") DO UPDATE SET
        "areaCd" = EXCLUDED."areaCd",
        "areaDesc" = EXCLUDED."areaDesc",
        "aoType" = EXCLUDED."aoType",
        "rangeCd" = EXCLUDED."rangeCd",
        "aoNo" = EXCLUDED."aoNo",
        "aoPplrName" = EXCLUDED."aoPplrName",
        "aoEmailId" = EXCLUDED."aoEmailId",
        "aoBldgId" = EXCLUDED."aoBldgId",
        "aoBldgDesc" = EXCLUDED."aoBldgDesc",
        "updatedAt" = CURRENT_TIMESTAMP
    `;

    await this.pool.query(sql, [
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
    ]);
  }

  async getUserByPan(pan: string): Promise<User | null> {
    const res = await this.pool.query('SELECT * FROM "users" WHERE "pan" = $1', [pan]);
    return res.rows[0] as User || null;
  }

  async getBankAccountsByPan(pan: string): Promise<BankAccount[]> {
    const res = await this.pool.query('SELECT * FROM "bank_accounts" WHERE "pan" = $1', [pan]);
    return res.rows as BankAccount[];
  }

  async getJurisdictionByPan(pan: string): Promise<Jurisdiction | null> {
    const res = await this.pool.query('SELECT * FROM "jurisdiction" WHERE "pan" = $1', [pan]);
    return res.rows[0] as Jurisdiction || null;
  }
}
