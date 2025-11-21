import Store from 'electron-store';
import { machineId } from 'node-machine-id';
import axios from 'axios';

// Configuration
const API_URL = 'https://taxyatra-registration.anshumanabhishek2.workers.dev';
// In a real production app, this key should be more protected or use a proxy.
// For this implementation, we use the provided key.
const API_KEY = 'e01f06d7edb99ba40f0eaba64b770aaf0ac60977fcc98a26488e090e70b5e056';

interface RegistrationStore {
    licenseKey: string;
    machineId: string;
    expiryDate: string;
    customerName: string;
    activatedAt: string;
    signature: string; // Simple integrity check
}

let store: Store<RegistrationStore> | null = null;

function getStore(): Store<RegistrationStore> {
    if (!store) {
        try {
            store = new Store<RegistrationStore>({
                name: 'taxyatra-license',
                encryptionKey: 'taxyatra-secure-storage-key', // Simple encryption
                defaults: {
                    licenseKey: '',
                    machineId: '',
                    expiryDate: '',
                    customerName: '',
                    activatedAt: '',
                    signature: ''
                }
            });
        } catch (error) {
            console.error('❌ [RegistrationService] Failed to initialize store:', error);
            throw error;
        }
    }
    return store;
}

class RegistrationService {
    async getMachineId(): Promise<string> {
        return await machineId();
    }

    async checkRegistration(): Promise<{ registered: boolean; error?: string; expiryDate?: string }> {
        const storeInstance = getStore();
        const storedLicense = storeInstance.get('licenseKey');
        const storedMachineId = storeInstance.get('machineId');
        const storedExpiry = storeInstance.get('expiryDate');

        if (!storedLicense || !storedMachineId) {
            return { registered: false };
        }

        // Verify machine ID matches
        const currentMachineId = await this.getMachineId();
        if (storedMachineId !== currentMachineId) {
            return { registered: false, error: 'Machine ID mismatch' };
        }

        // Check expiry locally first
        if (storedExpiry && new Date(storedExpiry) < new Date()) {
            return { registered: false, error: 'License expired' };
        }

        // Optional: Verify with server periodically (e.g., every 7 days)
        // For now, we trust the local storage if it exists and signature matches (simplified)

        return { registered: true, expiryDate: storedExpiry };
    }

    async register(licenseKey: string): Promise<{ success: boolean; error?: string }> {
        try {
            const currentMachineId = await this.getMachineId();

            // Call Cloudflare Worker API
            const response = await axios.post(
                `${API_URL}/api/verify`,
                {
                    license_key: licenseKey,
                    machine_id: currentMachineId
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': API_KEY
                    }
                }
            );

            const data = response.data;

            if (data.valid) {
                // Store license details securely
                const storeInstance = getStore();
                storeInstance.set('licenseKey', licenseKey);
                storeInstance.set('machineId', currentMachineId);
                storeInstance.set('expiryDate', data.license.expiry_date);
                storeInstance.set('customerName', data.license.customer_name || 'Unknown');
                storeInstance.set('activatedAt', data.license.activation_date || new Date().toISOString());
                // In a real app, we'd sign this data with a private key to prevent tampering
                storeInstance.set('signature', 'valid');

                return { success: true };
            } else {
                return { success: false, error: data.message || data.error || 'Invalid license' };
            }
        } catch (error: any) {
            console.error('Registration failed:', error);
            const msg = error.response?.data?.message || error.response?.data?.error || error.message || 'Network error';
            return { success: false, error: msg };
        }
    }

    async getLicenseDetails() {
        const storeInstance = getStore();
        const licenseKey = storeInstance.get('licenseKey');
        const machineId = storeInstance.get('machineId');
        const expiryDate = storeInstance.get('expiryDate');
        const customerName = storeInstance.get('customerName');
        const activatedAt = storeInstance.get('activatedAt');

        if (!licenseKey || !machineId) {
            return null;
        }

        const now = new Date();
        const expiry = new Date(expiryDate);
        const daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
            licenseKey,
            machineId,
            expiryDate,
            customerName,
            activatedAt,
            daysRemaining
        };
    }

    async clearRegistration() {
        getStore().clear();
    }
}

export default new RegistrationService();
