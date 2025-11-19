import { ipcMain } from 'electron';
import authService from '../services/auth.service';
import { IPC_CHANNELS } from '../../shared/constants';

export const registerAuthHandlers = () => {
  ipcMain.handle('check-activation', async () => {
    try {
      return await authService.isAppActivated();
    } catch (error) {
      console.error('Error checking activation:', error);
      return false;
    }
  });

  ipcMain.handle('validate-activation-code', async (_, code: string) => {
    try {
      return await authService.validateAndStoreActivationCode(code);
    } catch (error) {
      console.error('Error validating activation code:', error);
      return false;
    }
  });

  ipcMain.handle('save-pan-credentials', async (_, pan: string, password: string) => {
    return authService.savePanCredentials(pan, password);
  });

  ipcMain.handle('get-pan-credentials', async () => {
    try {
      return await authService.getPanCredentials();
    } catch (error) {
      console.error('Error getting PAN credentials:', error);
      return [];
    }
  });

  ipcMain.handle('get-pan-with-password', async (_, pan: string) => {
    try {
      return await authService.getPanWithPassword(pan);
    } catch (error) {
      console.error('Error getting PAN with password:', error);
      return null;
    }
  });
};
