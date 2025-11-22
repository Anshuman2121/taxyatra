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
    // This method is kept for legacy support or manual updates if needed, 
    // but ideally we should use ITRRepository for saving profile data.
    // For now, we'll update it to save to 'person' and 'address' tables to maintain compatibility
    // if this method is called directly (e.g. from manual entry in AddUserPage).

    const transaction = this.db.transaction(() => {
      // 1. Save/Update Person
      const personStmt = this.db.prepare(`
            INSERT INTO "person" (
                "pan", "first_name", "last_name_or_org_name", 
                "dob", "aadhaar", "email", "mobile", "status_or_company_type",
                "updated_at"
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT ("pan") DO UPDATE SET
                "first_name" = excluded."first_name",
                "last_name_or_org_name" = excluded."last_name_or_org_name",
                "dob" = excluded."dob",
                "aadhaar" = excluded."aadhaar",
                "email" = excluded."email",
                "mobile" = excluded."mobile",
                "status_or_company_type" = excluded."status_or_company_type",
                "updated_at" = CURRENT_TIMESTAMP
        `);

      personStmt.run(
        userData.pan,
        userData.firstName,
        userData.lastName,
        userData.dob, // Assuming dob matches format YYYY-MM-DD or similar
        userData.aadhaarNum,
        userData.email,
        userData.mobileNo,
        userData.userType // Mapping userType to status
      );

      // Get person_id
      const person = this.db.prepare('SELECT "person_id" FROM "person" WHERE "pan" = ?').get(userData.pan) as any;
      if (person) {
        // 2. Save/Update Address
        this.db.prepare('DELETE FROM "address" WHERE "person_id" = ?').run(person.person_id);

        const addressStmt = this.db.prepare(`
                INSERT INTO "address" (
                    "person_id", "residence_no", "street", 
                    "locality", "city", "state_code", "pin_code", "country_code"
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

        addressStmt.run(
          person.person_id,
          userData.addrLine1Txt, // Mapping addrLine1 to residence_no
          userData.addrLine2Txt, // Mapping addrLine2 to street
          userData.addrLine3Txt, // Mapping addrLine3 to locality
          userData.addrLine4Txt, // Mapping addrLine4 to city (approx)
          userData.stateCd,
          userData.pinCd,
          '91'
        );
      }
    });
    transaction();
  }

  async saveBankAccounts(pan: string, bankAccounts: Partial<BankAccount>[]): Promise<void> {
    const person = this.db.prepare('SELECT "person_id" FROM "person" WHERE "pan" = ?').get(pan) as any;
    if (!person) return;

    const transaction = this.db.transaction(() => {
      // First delete existing bank accounts for this person
      this.db.prepare('DELETE FROM "bank_account" WHERE "person_id" = ?').run(person.person_id);

      // Insert new bank accounts
      const stmt = this.db.prepare(`
        INSERT INTO "bank_account" (
          "person_id", "ifsc", "bank_name", "account_number", 
          "account_type", "use_for_refund"
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const account of bankAccounts) {
        stmt.run(
          person.person_id,
          account.ifscCd,
          account.bankName,
          account.bankAcctNum,
          account.accountType,
          0 // Default to 0 as we don't have this info in the partial type usually
        );
      }
    });

    transaction();
  }

  async saveJurisdiction(jurisdictionData: Partial<Jurisdiction>): Promise<void> {
    // Jurisdiction table is legacy/not in new schema yet. 
    // We can keep saving to the legacy table if needed, or ignore.
    // For now, let's keep the legacy table write to avoid errors if it exists.
    try {
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
    } catch (e) {
      console.warn('Failed to save jurisdiction (table might not exist):', e);
    }
  }

  async getUserByPan(pan: string): Promise<User | null> {
    // Fetch from 'person' and 'address' tables and map to User interface
    const stmt = this.db.prepare(`
        SELECT 
            p.pan,
            p.first_name as firstName,
            p.last_name_or_org_name as lastName,
            (COALESCE(p.first_name, '') || ' ' || COALESCE(p.middle_name, '') || ' ' || COALESCE(p.last_name_or_org_name, '')) as fullName,
            p.mobile as mobileNo,
            p.email,
            a.residence_no as addrLine1Txt,
            a.street as addrLine2Txt,
            a.locality as addrLine3Txt,
            a.city as addrLine4Txt,
            a.pin_code as pinCd,
            a.state_code as stateCd,
            p.aadhaar as aadhaarNum,
            p.dob,
            p.status_or_company_type as userType,
            'Active' as panStatus, -- Default
            p.updated_at as updatedAt
        FROM person p
        LEFT JOIN address a ON p.person_id = a.person_id
        WHERE p.pan = ?
    `);

    const result = stmt.get(pan) as any;
    if (!result) return null;

    // Clean up fullName
    result.fullName = result.fullName.replace(/\s+/g, ' ').trim();

    return result as User;
  }

  async getBankAccountsByPan(pan: string): Promise<BankAccount[]> {
    // Fetch from 'bank_account' table via 'person' table
    const stmt = this.db.prepare(`
        SELECT 
            p.pan,
            b.account_number as bankAcctNum,
            b.ifsc as ifscCd,
            b.bank_name as bankName,
            '' as bankBrnchTxt, -- Not in new schema
            '' as nameAsPerBank, -- Not in new schema
            b.account_type as accountType,
            'Active' as status,
            b.use_for_refund as refundFlag
        FROM bank_account b
        JOIN person p ON b.person_id = p.person_id
        WHERE p.pan = ?
    `);

    return stmt.all(pan) as BankAccount[];
  }

  async getJurisdictionByPan(pan: string): Promise<Jurisdiction | null> {
    // Try to fetch from legacy jurisdiction table
    try {
      const stmt = this.db.prepare('SELECT * FROM "jurisdiction" WHERE "pan" = ?');
      return stmt.get(pan) as Jurisdiction || null;
    } catch (e) {
      return null;
    }
  }

  async getAllUsers(): Promise<User[]> {
    // Fetch all users from 'person' table and 'pan_credentials'
    const stmt = this.db.prepare(`
      SELECT 
        COALESCE(p.pan, pc.pan) as pan,
        p.first_name as firstName,
        p.last_name_or_org_name as lastName,
        (COALESCE(p.first_name, '') || ' ' || COALESCE(p.middle_name, '') || ' ' || COALESCE(p.last_name_or_org_name, '')) as fullName,
        p.mobile as mobileNo,
        p.email,
        'Active' as panStatus,
        p.updated_at as updatedAt,
        pc.created_at as credentialCreatedAt
      FROM pan_credentials pc
      LEFT JOIN person p ON pc.pan = p.pan
      UNION
      SELECT 
        p.pan,
        p.first_name as firstName,
        p.last_name_or_org_name as lastName,
        (COALESCE(p.first_name, '') || ' ' || COALESCE(p.middle_name, '') || ' ' || COALESCE(p.last_name_or_org_name, '')) as fullName,
        p.mobile as mobileNo,
        p.email,
        'Active' as panStatus,
        p.updated_at as updatedAt,
        NULL as credentialCreatedAt
      FROM person p
      LEFT JOIN pan_credentials pc ON p.pan = pc.pan
      WHERE pc.pan IS NULL
      ORDER BY credentialCreatedAt DESC, updatedAt DESC
    `);

    const results = stmt.all() as any[];

    // Clean up full names
    return results.map(u => ({
      ...u,
      fullName: u.fullName ? u.fullName.replace(/\s+/g, ' ').trim() : ''
    })) as User[];
  }
}
