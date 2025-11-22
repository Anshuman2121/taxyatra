import path from 'path';
import { app } from 'electron';

export const sqliteConfig = {
    filename: path.join(app.getPath('userData'), 'taxyatra.sqlite'),
};

export const dbConfig = sqliteConfig;
