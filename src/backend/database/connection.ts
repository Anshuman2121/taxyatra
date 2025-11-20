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

    // Create registration table
    await client.query(`
            CREATE TABLE IF NOT EXISTS "registration" (
                "id" SERIAL PRIMARY KEY,
                "activation_code" TEXT NOT NULL,
                "is_activated" BOOLEAN DEFAULT true,
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Create inventory table
    await client.query(`
            CREATE TABLE IF NOT EXISTS "inventory" (
                "id" SERIAL PRIMARY KEY,
                "name" TEXT NOT NULL,
                "status" TEXT NOT NULL,
                "pan" TEXT NOT NULL,
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Create pan_credentials table
    await client.query(`
            CREATE TABLE IF NOT EXISTS "pan_credentials" (
                "pan" TEXT PRIMARY KEY,
                "password" TEXT NOT NULL,
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Create users table
    await client.query(`
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
                "dateOfBirth" BIGINT,
                "dob" TEXT,
                "userGender" TEXT,
                "userType" TEXT,
                "role" TEXT,
                "panStatus" TEXT,
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Create bank accounts table
    await client.query(`
            CREATE TABLE IF NOT EXISTS "bank_accounts" (
                "id" SERIAL PRIMARY KEY,
                "pan" TEXT,
                "bankAcctNum" TEXT,
                "ifscCd" TEXT,
                "bankName" TEXT,
                "bankBrnchTxt" TEXT,
                "nameAsPerBank" TEXT,
                "accountType" TEXT,
                "status" TEXT,
                "submitDt" BIGINT,
                "validDt" BIGINT,
                "refundFlag" TEXT,
                "accountStatus" TEXT,
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("pan") REFERENCES "users" ("pan")
            )
        `);

    // Create jurisdiction table
    await client.query(`
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
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("pan") REFERENCES "users" ("pan")
            )
        `);

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
