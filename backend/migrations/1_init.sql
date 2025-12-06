CREATE TABLE IF NOT EXISTS "pan_credentials" (
  "pan" TEXT PRIMARY KEY,
  "password" TEXT NOT NULL,
  "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "registration" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "activation_code" TEXT NOT NULL,
  "is_activated" INTEGER DEFAULT 1,
  "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "person" (
  "person_id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "pan" TEXT UNIQUE,
  "person_type" TEXT,
  "first_name" TEXT,
  "middle_name" TEXT,
  "last_name_or_org_name" TEXT,
  "dob" TEXT,
  "date_of_incorp" TEXT,
  "aadhaar" TEXT,
  "email" TEXT,
  "mobile" TEXT,
  "status_or_company_type" TEXT,
  "sub_status" TEXT,
  "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "itr_return" (
  "return_id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "person_id" INTEGER NOT NULL,
  "pan" TEXT,
  "itr_type" TEXT,
  "assessment_year" TEXT,
  "filing_section" TEXT,
  "orig_return_date" TEXT,
  "receipt_no" TEXT,
  "notice_section" TEXT,
  "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY("person_id") REFERENCES "person"("person_id") ON DELETE CASCADE,
  UNIQUE("person_id", "assessment_year")
);

CREATE TABLE IF NOT EXISTS "address" (
  "address_id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "person_id" INTEGER,
  "address_type" TEXT,
  "residence_no" TEXT,
  "residence_name" TEXT,
  "street" TEXT,
  "locality" TEXT,
  "city" TEXT,
  "state_code" TEXT,
  "country_code" TEXT,
  "pin_code" TEXT,
  "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY("person_id") REFERENCES "person"("person_id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "bank_account" (
  "bank_account_id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "person_id" INTEGER,
  "ifsc" TEXT,
  "bank_name" TEXT,
  "account_number" TEXT,
  "account_type" TEXT,
  "use_for_refund" INTEGER DEFAULT 0,
  "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY("person_id") REFERENCES "person"("person_id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "salary_income" (
  "salary_id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "return_id" INTEGER,
  "person_id" INTEGER,
  "employer_name" TEXT,
  "employer_tan" TEXT,
  "nature_of_employment" TEXT,
  "gross_salary" REAL,
  "salary" REAL,
  "perquisites_value" REAL,
  "profits_in_lieu" REAL,
  "standard_deduction" REAL,
  "professional_tax" REAL,
  "net_salary" REAL,
  "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY("return_id") REFERENCES "itr_return"("return_id") ON DELETE CASCADE,
  FOREIGN KEY("person_id") REFERENCES "person"("person_id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "other_income" (
  "other_id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "return_id" INTEGER,
  "person_id" INTEGER,
  "nature_desc" TEXT,
  "amount" REAL,
  "is_notified_89a" INTEGER,
  "notified_country" TEXT,
  "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY("return_id") REFERENCES "itr_return"("return_id") ON DELETE CASCADE,
  FOREIGN KEY("person_id") REFERENCES "person"("person_id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "tds_salary" (
  "tds_sal_id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "return_id" INTEGER,
  "employer_name" TEXT,
  "tan" TEXT,
  "income_chargeable" REAL,
  "tds_deducted" REAL,
  "tds_claimed" REAL,
  "financial_year" TEXT,
  "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY("return_id") REFERENCES "itr_return"("return_id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "deductions_master" (
  "deduction_id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "return_id" INTEGER,
  "section_code" TEXT,
  "amount" REAL,
  "details" TEXT,
  "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY("return_id") REFERENCES "itr_return"("return_id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "users" (
  "pan" TEXT PRIMARY KEY,
  "firstName" TEXT,
  "lastName" TEXT,
  "fullName" TEXT,
  "mobileNo" TEXT,
  "email" TEXT,
  "addrLine1Txt" TEXT,
  "addrLine2Txt" TEXT,
  "addrLine3Txt" TEXT,
  "addrLine4Txt" TEXT,
  "pinCd" INTEGER,
  "stateCd" TEXT,
  "aadhaarNum" TEXT,
  "dateOfBirth" INTEGER,
  "dob" TEXT,
  "userGender" TEXT,
  "userType" TEXT,
  "role" TEXT,
  "panStatus" TEXT,
  "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "bank_accounts" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "pan" TEXT,
  "bankAcctNum" TEXT,
  "ifscCd" TEXT,
  "bankName" TEXT,
  "bankBrnchTxt" TEXT,
  "nameAsPerBank" TEXT,
  "accountType" TEXT,
  "status" TEXT,
  "submitDt" INTEGER,
  "validDt" INTEGER,
  "refundFlag" TEXT,
  "accountStatus" TEXT,
  "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY("pan") REFERENCES "users"("pan") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "jurisdiction" (
  "pan" TEXT PRIMARY KEY,
  "areaCd" TEXT,
  "areaDesc" TEXT,
  "aoType" TEXT,
  "rangeCd" TEXT,
  "aoNo" TEXT,
  "aoPplrName" TEXT,
  "aoEmailId" TEXT,
  "aoBldgId" TEXT,
  "aoBldgDesc" TEXT,
  "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY("pan") REFERENCES "users"("pan") ON DELETE CASCADE
);
