import { app } from 'electron';
import path from 'path';
import { DB_CONFIG } from '../../shared/constants';

export const getDatabasePath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, DB_CONFIG.DB_FILE);
};

export const getEncryptedDatabasePath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, DB_CONFIG.ENCRYPTED_DB_FILE);
};
