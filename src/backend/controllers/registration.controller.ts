import { ipcMain } from 'electron';
import registrationService from '../services/RegistrationService';

export function registerRegistrationHandlers() {
    ipcMain.handle('registration:check', async () => {
        return await registrationService.checkRegistration();
    });

    ipcMain.handle('registration:submit', async (event, licenseKey: string) => {
        return await registrationService.register(licenseKey);
    });

    ipcMain.handle('registration:machine-id', async () => {
        return await registrationService.getMachineId();
    });

    ipcMain.handle('registration:details', async () => {
        return await registrationService.getLicenseDetails();
    });

    ipcMain.handle('registration:revoke', async () => {
        await registrationService.clearRegistration();
        return { success: true };
    });
}
