import Database from 'better-sqlite3';

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
  constructor(private db: Database.Database) { }

  // createTables removed as it is handled in connection.ts

  async saveUser(userData: Partial<User>): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO "users" (
        "pan", "firstName", "lastName", "fullName", "mobileNo", "email",
        "addrLine1Txt", "addrLine2Txt", "addrLine3Txt", "addrLine4Txt",
        "pinCd", "stateCd", "aadhaarNum", "dateOfBirth", "dob",
        "userGender", "userType", "role", "panStatus", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT ("pan") DO UPDATE SET
        "firstName" = excluded."firstName",
        "lastName" = excluded."lastName",
        "fullName" = excluded."fullName",
        "mobileNo" = excluded."mobileNo",
        "email" = excluded."email",
        "addrLine1Txt" = excluded."addrLine1Txt",
        "addrLine2Txt" = excluded."addrLine2Txt",
        "addrLine3Txt" = excluded."addrLine3Txt",
        "addrLine4Txt" = excluded."addrLine4Txt",
        "pinCd" = excluded."pinCd",
        "stateCd" = excluded."stateCd",
        "aadhaarNum" = excluded."aadhaarNum",
        "dateOfBirth" = excluded."dateOfBirth",
        "dob" = excluded."dob",
        "userGender" = excluded."userGender",
        "userType" = excluded."userType",
        "role" = excluded."role",
        "panStatus" = excluded."panStatus",
        "updatedAt" = CURRENT_TIMESTAMP
    `);

    stmt.run(
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
    );
  }

  async saveBankAccounts(pan: string, bankAccounts: Partial<BankAccount>[]): Promise<void> {
    const transaction = this.db.transaction(() => {
      // First delete existing bank accounts for this PAN
      this.db.prepare('DELETE FROM "bank_accounts" WHERE "pan" = ?').run(pan);

      // Insert new bank accounts
      const stmt = this.db.prepare(`
        INSERT INTO "bank_accounts" (
          "pan", "bankAcctNum", "ifscCd", "bankName", "bankBrnchTxt",
          "nameAsPerBank", "accountType", "status", "submitDt", "validDt",
          "refundFlag", "accountStatus"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const account of bankAccounts) {
        stmt.run(
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
        );
      }
    });

    transaction();
  }

  async saveJurisdiction(jurisdictionData: Partial<Jurisdiction>): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO "jurisdiction" (
        "pan", "areaCd", "areaDesc", "aoType", "rangeCd", "aoNo",
        "aoPplrName", "aoEmailId", "aoBldgId", "aoBldgDesc", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT ("pan") DO UPDATE SET
        "areaCd" = excluded."areaCd",
        "areaDesc" = excluded."areaDesc",
        "aoType" = excluded."aoType",
        "rangeCd" = excluded."rangeCd",
        "aoNo" = excluded."aoNo",
        "aoPplrName" = excluded."aoPplrName",
        "aoEmailId" = excluded."aoEmailId",
        "aoBldgId" = excluded."aoBldgId",
        "aoBldgDesc" = excluded."aoBldgDesc",
        "updatedAt" = CURRENT_TIMESTAMP
    `);

    stmt.run(
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
    );
  }

  async getUserByPan(pan: string): Promise<User | null> {
    const stmt = this.db.prepare('SELECT * FROM "users" WHERE "pan" = ?');
    return stmt.get(pan) as User || null;
  }

  async getBankAccountsByPan(pan: string): Promise<BankAccount[]> {
    const stmt = this.db.prepare('SELECT * FROM "bank_accounts" WHERE "pan" = ?');
    return stmt.all(pan) as BankAccount[];
  }

  async getJurisdictionByPan(pan: string): Promise<Jurisdiction | null> {
    const stmt = this.db.prepare('SELECT * FROM "jurisdiction" WHERE "pan" = ?');
    return stmt.get(pan) as Jurisdiction || null;
  }
}
