import { Pool, PoolClient } from 'pg';
import { app } from 'electron';
import { dbConfig, useLocalPostgres, postgresConfig } from '../config/database.config';

let pool: Pool;

export function initDatabase(): Promise<Pool> {
  return new Promise(async (resolve, reject) => {
    try {
      if (useLocalPostgres) {
        // Create database if it doesn't exist
        await createDatabaseIfNotExists();

        console.log('Initializing PostgreSQL connection with config:', { ...dbConfig, password: '****' });
        pool = new Pool(dbConfig);

        // Test connection
        const client = await pool.connect();
        console.log('Successfully connected to PostgreSQL');
        client.release();

        await createTables();
      } else {
        console.log('Using SQLite database');
        // SQLite initialization would go here
      }

      resolve(pool);
    } catch (err) {
      console.error('Failed to initialize database:', err);
      reject(err);
    }
  });
}

export function getDatabase(): Pool {
  return pool;
}

export function closeDatabase(): void {
  if (pool) {
    pool.end().then(() => {
      console.log('Database pool closed successfully');
    }).catch(err => {
      console.error('Error closing database pool:', err);
    });
  }
}

async function createDatabaseIfNotExists(): Promise<void> {
  const tempPool = new Pool({
    ...postgresConfig,
    database: 'postgres', // Connect to default postgres database
  });

  try {
    const client = await tempPool.connect();
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [postgresConfig.database]
    );

    if (result.rows.length === 0) {
      await client.query(`CREATE DATABASE ${postgresConfig.database}`);
      console.log(`Database '${postgresConfig.database}' created successfully`);
    }

    client.release();
  } catch (err) {
    console.error('Error creating database:', err);
  } finally {
    await tempPool.end();
  }
}

async function createTables(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create pan_credentials table (needed for authentication)
    await client.query(`
            CREATE TABLE IF NOT EXISTS "pan_credentials" (
                "pan" TEXT PRIMARY KEY,
                "password" TEXT NOT NULL,
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // ========== ITR TABLES ==========

    // Create person table first (master table)
    await client.query(`
            CREATE TABLE IF NOT EXISTS "person" (
                "person_id" BIGSERIAL PRIMARY KEY,
                "pan" VARCHAR(20) UNIQUE,
                "person_type" VARCHAR(50),
                "first_name" VARCHAR(200),
                "middle_name" VARCHAR(200),
                "last_name_or_org_name" VARCHAR(300),
                "dob" DATE,
                "date_of_incorp" DATE,
                "aadhaar" VARCHAR(20),
                "email" VARCHAR(255),
                "mobile" VARCHAR(30),
                "status_or_company_type" VARCHAR(100),
                "sub_status" VARCHAR(100),
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Create itr_return table - one record per person per assessment year
    await client.query(`
            CREATE TABLE IF NOT EXISTS "itr_return" (
                "return_id" BIGSERIAL PRIMARY KEY,
                "person_id" BIGINT NOT NULL,
                "pan" VARCHAR(20),
                "itr_type" VARCHAR(10),
                "assessment_year" VARCHAR(9),
                "filing_section" VARCHAR(50),
                "orig_return_date" DATE,
                "receipt_no" VARCHAR(100),
                "notice_section" VARCHAR(50),
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY("person_id") REFERENCES "person"("person_id") ON DELETE CASCADE,
                UNIQUE("person_id", "assessment_year")
            )
        `);

    // Create address table
    await client.query(`
            CREATE TABLE IF NOT EXISTS "address" (
                "address_id" BIGSERIAL PRIMARY KEY,
                "person_id" BIGINT,
                "address_type" VARCHAR(50),
                "residence_no" VARCHAR(200),
                "residence_name" VARCHAR(200),
                "street" VARCHAR(300),
                "locality" VARCHAR(255),
                "city" VARCHAR(150),
                "state_code" VARCHAR(20),
                "country_code" VARCHAR(10),
                "pin_code" VARCHAR(20),
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY("person_id") REFERENCES "person"("person_id") ON DELETE CASCADE
            )
        `);

    // Create bank_account table for ITR (separate from existing bank_accounts)
    await client.query(`
            CREATE TABLE IF NOT EXISTS "bank_account" (
                "bank_account_id" BIGSERIAL PRIMARY KEY,
                "person_id" BIGINT,
                "ifsc" VARCHAR(20),
                "bank_name" VARCHAR(255),
                "account_number" VARCHAR(50),
                "account_type" VARCHAR(50),
                "use_for_refund" BOOLEAN DEFAULT FALSE,
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY("person_id") REFERENCES "person"("person_id") ON DELETE CASCADE
            )
        `);

    // Create salary_income table
    await client.query(`
            CREATE TABLE IF NOT EXISTS "salary_income" (
                "salary_id" BIGSERIAL PRIMARY KEY,
                "return_id" BIGINT,
                "person_id" BIGINT,
                "employer_name" VARCHAR(255),
                "employer_tan" VARCHAR(50),
                "nature_of_employment" VARCHAR(100),
                "gross_salary" DECIMAL(18,2),
                "salary" DECIMAL(18,2),
                "perquisites_value" DECIMAL(18,2),
                "profits_in_lieu" DECIMAL(18,2),
                "standard_deduction" DECIMAL(18,2),
                "professional_tax" DECIMAL(18,2),
                "net_salary" DECIMAL(18,2),
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY("return_id") REFERENCES "itr_return"("return_id") ON DELETE CASCADE,
                FOREIGN KEY("person_id") REFERENCES "person"("person_id") ON DELETE SET NULL
            )
        `);

    // Create other_income table
    await client.query(`
            CREATE TABLE IF NOT EXISTS "other_income" (
                "other_id" BIGSERIAL PRIMARY KEY,
                "return_id" BIGINT,
                "person_id" BIGINT,
                "nature_desc" VARCHAR(400),
                "amount" DECIMAL(18,2),
                "is_notified_89a" BOOLEAN,
                "notified_country" VARCHAR(10),
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY("return_id") REFERENCES "itr_return"("return_id") ON DELETE CASCADE,
                FOREIGN KEY("person_id") REFERENCES "person"("person_id") ON DELETE SET NULL
            )
        `);

    // Create tds_salary table
    await client.query(`
            CREATE TABLE IF NOT EXISTS "tds_salary" (
                "tds_sal_id" BIGSERIAL PRIMARY KEY,
                "return_id" BIGINT,
                "employer_name" VARCHAR(255),
                "tan" VARCHAR(50),
                "income_chargeable" DECIMAL(18,2),
                "tds_deducted" DECIMAL(18,2),
                "tds_claimed" DECIMAL(18,2),
                "financial_year" VARCHAR(9),
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY("return_id") REFERENCES "itr_return"("return_id") ON DELETE CASCADE
            )
        `);

    // Create deductions_master table
    await client.query(`
            CREATE TABLE IF NOT EXISTS "deductions_master" (
                "deduction_id" BIGSERIAL PRIMARY KEY,
                "return_id" BIGINT,
                "section_code" VARCHAR(50),
                "amount" DECIMAL(18,2),
                "details" JSON,
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY("return_id") REFERENCES "itr_return"("return_id") ON DELETE CASCADE
            )
        `);

    await client.query('COMMIT');
    console.log('All tables created successfully');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error creating tables:', e);
    throw e;
  } finally {
    client.release();
  }
}
