import CryptoJS from 'crypto-js';
import { app } from 'electron';

// Generate a unique key based on machine info
const getEncryptionKey = (): string => {
  const machineId = app.getName() + app.getVersion();
  return CryptoJS.SHA256(machineId).toString();
};

export function encryptData(data: string): string {
  const key = getEncryptionKey();
  return CryptoJS.AES.encrypt(data, key).toString();
}

export function decryptData(encryptedData: string): string {
  const key = getEncryptionKey();
  const bytes = CryptoJS.AES.decrypt(encryptedData, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}
