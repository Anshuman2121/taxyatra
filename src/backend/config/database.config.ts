import path from 'path';
import { app } from 'electron';

// Set to true to use local PostgreSQL, false to use embedded SQLite
export const useLocalPostgres = false;

export const sqliteConfig = {
    filename: path.join(app.getPath('userData'), 'taxyatra.sqlite'),
};

export const postgresConfig = {
    user: 'admin',
    host: 'localhost',
    database: 'taxyatra',
    password: 'admin',
    port: 5432,
};

export const dbConfig = useLocalPostgres ? postgresConfig : sqliteConfig;
