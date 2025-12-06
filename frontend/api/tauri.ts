/**
 * Unified Tauri API Layer
 * 
 * All frontend-to-backend communication goes through this file.
 * Uses Tauri SQL plugin for database and WebSocket for sidecar.
 */

import Database from '@tauri-apps/plugin-sql';
import { invoke } from '@tauri-apps/api/core';
import { downloadDir, appDataDir, join } from '@tauri-apps/api/path';

// ============================================================================
// Database Singleton
// ============================================================================

let db: Database | null = null;

async function getDB(): Promise<Database> {
    if (!db) {
        db = await Database.load('sqlite:taxyatra.db');
    }
    return db;
}

// ============================================================================
// Sidecar WebSocket Communication
// ============================================================================

let ws: WebSocket | null = null;
let sidecarPort: number | null = null;
let requestCounter = 0;
const pendingRequests = new Map<number, { resolve: Function; reject: Function }>();
let connectionPromise: Promise<void> | null = null;

// Event handlers
let progressHandler: ((status: string) => void) | null = null;
let captchaHandler: ((image: string) => void) | null = null;

async function connectSidecar(): Promise<void> {
    if (ws?.readyState === WebSocket.OPEN) return;
    if (connectionPromise) return connectionPromise;

    connectionPromise = new Promise(async (resolve) => {
        // Poll for sidecar port from Rust backend
        while (!sidecarPort) {
            try {
                sidecarPort = await invoke<number>('get_sidecar_port');
            } catch {
                await new Promise(r => setTimeout(r, 500));
            }
        }

        const socket = new WebSocket(`ws://localhost:${sidecarPort}`);

        socket.onopen = async () => {
            console.log('Sidecar connected');
            ws = socket;
            // Initialize sidecar with app data path
            const userDataPath = await appDataDir();
            sendToSidecar('init', { userDataPath }).catch(console.error);
            resolve();
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            // Response to a request
            if (data.id && pendingRequests.has(data.id)) {
                const { resolve, reject } = pendingRequests.get(data.id)!;
                pendingRequests.delete(data.id);
                if (data.error) reject(new Error(data.error));
                else resolve(data.result);
            }
            // Event from sidecar
            else if (data.method === 'progress' && progressHandler) {
                progressHandler(data.params.status);
            }
            else if (data.method === 'captcha_required' && captchaHandler) {
                captchaHandler(data.params.image);
            }
        };

        socket.onclose = () => {
            ws = null;
            connectionPromise = null;
            setTimeout(connectSidecar, 2000);
        };
    });

    return connectionPromise;
}

async function sendToSidecar(method: string, params: any = {}): Promise<any> {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        await connectSidecar();
    }

    return new Promise((resolve, reject) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            reject(new Error('Sidecar connection failed'));
            return;
        }
        const id = ++requestCounter;
        pendingRequests.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
    });
}

// ============================================================================
// API Functions
// ============================================================================

export const api = {
    // --- Registration ---
    async checkRegistration(): Promise<{ registered: boolean }> {
        return sendToSidecar('registration_check');
    },

    async submitRegistration(licenseKey: string): Promise<{ success: boolean; error?: string }> {
        return sendToSidecar('registration_submit', { licenseKey });
    },

    async getMachineId(): Promise<string> {
        const result = await sendToSidecar('registration_machine_id');
        return result.machineId;
    },

    async getLicenseDetails(): Promise<any> {
        return sendToSidecar('registration_check');
    },

    async revokeLicense(): Promise<void> {
        return sendToSidecar('registration_revoked');
    },

    // --- User CRUD ---
    async getAllUsers(): Promise<any[]> {
        const db = await getDB();
        return db.select('SELECT * FROM users ORDER BY updatedAt DESC');
    },

    async getUserData(pan: string): Promise<any> {
        const db = await getDB();

        const [user] = await db.select<any[]>('SELECT * FROM users WHERE pan = $1', [pan]);
        if (!user) return null;

        const bankAccounts = await db.select('SELECT * FROM bank_accounts WHERE pan = $1', [pan]);
        const [jurisdiction] = await db.select<any[]>('SELECT * FROM jurisdiction WHERE pan = $1', [pan]);

        return { user, bankAccounts, jurisdiction };
    },

    async saveUser(pan: string, userData: any, bankAccounts?: any[], jurisdictionData?: any): Promise<void> {
        console.log('=== saveUser START ===');
        console.log('PAN:', pan);

        const db = await getDB();
        const u = userData;

        // Save to users table
        console.log('Saving to users table...');
        await db.execute(`
            INSERT INTO users (pan, firstName, lastName, fullName, mobileNo, email, addrLine1Txt, addrLine2Txt, addrLine3Txt, addrLine4Txt, pinCd, stateCd, aadhaarNum, dob, userGender, updatedAt)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
            ON CONFLICT (pan) DO UPDATE SET
                firstName = excluded.firstName,
                lastName = excluded.lastName,
                fullName = excluded.fullName,
                mobileNo = excluded.mobileNo,
                email = excluded.email,
                addrLine1Txt = excluded.addrLine1Txt,
                addrLine2Txt = excluded.addrLine2Txt,
                addrLine3Txt = excluded.addrLine3Txt,
                addrLine4Txt = excluded.addrLine4Txt,
                pinCd = excluded.pinCd,
                stateCd = excluded.stateCd,
                aadhaarNum = excluded.aadhaarNum,
                dob = excluded.dob,
                userGender = excluded.userGender,
                updatedAt = CURRENT_TIMESTAMP
        `, [
            pan,
            u.firstName || '',
            u.lastName || '',
            [u.firstName, u.middleName, u.lastName].filter(Boolean).join(' '),
            u.mobile || '',
            u.emailInReturn || u.email || '',
            u.resFlat || '',
            u.resBuilding || '',
            u.resRoad || '',
            u.resCity || '',
            u.resPin ? parseInt(u.resPin) : null,
            u.resState || '',
            u.aadhaarNumber || '',
            u.birthDate || u.dob || '',
            u.gender || 'M'
        ]);
        console.log('User saved successfully');

        // Save bank accounts
        if (bankAccounts && bankAccounts.length > 0) {
            console.log('Saving bank accounts:', bankAccounts.length);
            await db.execute('DELETE FROM bank_accounts WHERE pan = $1', [pan]);
            for (const acc of bankAccounts) {
                await db.execute(`
                    INSERT INTO bank_accounts (pan, bankAcctNum, ifscCd, bankName, bankBrnchTxt, nameAsPerBank, accountType)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [pan, acc.accountNumber || '', acc.ifsc || '', acc.bankName || '', acc.branch || '', acc.nameAsPerBank || '', acc.accountType || 'Savings']);
            }
            console.log('Bank accounts saved');
        }

        // Save jurisdiction
        if (jurisdictionData && jurisdictionData.areaDesc) {
            console.log('Saving jurisdiction...');
            await db.execute('DELETE FROM jurisdiction WHERE pan = $1', [pan]);
            await db.execute(`
                INSERT INTO jurisdiction (pan, areaCd, areaDesc, aoType, rangeCd, aoNo, aoPplrName, aoEmailId)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [pan, jurisdictionData.areaCd || '', jurisdictionData.areaDesc || '', jurisdictionData.aoType || '', jurisdictionData.rangeCd || '', jurisdictionData.aoNo || '', jurisdictionData.aoPplrName || '', jurisdictionData.aoEmailId || '']);
            console.log('Jurisdiction saved');
        }

        console.log('=== saveUser END ===');
    },

    async deleteUser(pan: string): Promise<void> {
        const db = await getDB();
        await db.execute('DELETE FROM bank_accounts WHERE pan = $1', [pan]);
        await db.execute('DELETE FROM jurisdiction WHERE pan = $1', [pan]);
        await db.execute('DELETE FROM users WHERE pan = $1', [pan]);
    },

    // --- Credentials ---
    async savePanCredentials(pan: string, password: string): Promise<void> {
        const db = await getDB();
        await db.execute(`
            INSERT INTO pan_credentials (pan, password, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT(pan) DO UPDATE SET password = excluded.password, updated_at = CURRENT_TIMESTAMP
        `, [pan, password]);
    },

    async getPanWithPassword(pan: string): Promise<{ pan: string; password: string } | null> {
        const db = await getDB();
        const [result] = await db.select<any[]>('SELECT * FROM pan_credentials WHERE pan = $1', [pan]);
        return result || null;
    },

    // --- Profile Fetch (Sidecar) ---
    async fetchUserProfile(pan: string, password: string, save = false): Promise<{ success: boolean; data?: any; message?: string }> {
        try {
            const data = await sendToSidecar('fetch_profile', { pan, password });

            if (save && data) {
                try {
                    // Map API response to our save format
                    const user = data.personalInfo || {};
                    await this.saveUser(pan, {
                        firstName: user.firstName,
                        middleName: user.middleName,
                        lastName: user.lastName,
                        birthDate: user.dob,
                        aadhaarNumber: user.aadhaarNumber,
                        emailInReturn: user.email,
                        mobile: user.mobile,
                        status: user.status
                    }, data.bankAccounts, data.jurisdictionDetails);
                } catch (e) {
                    console.error('Failed to save fetched profile:', e);
                }
            }

            return { success: true, data };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    },

    // --- Downloads (Sidecar) ---
    async getDownloadPath(pan: string): Promise<string> {
        const dl = await downloadDir();
        return join(dl, 'TaxYatra', pan);
    },

    async downloadAIS(pan: string, password: string, financialYear: string): Promise<any> {
        const downloadPath = await this.getDownloadPath(pan);
        return sendToSidecar('download_ais', { pan, password, financialYear, downloadPath });
    },

    async downloadTIS(pan: string, password: string, financialYear: string): Promise<any> {
        const downloadPath = await this.getDownloadPath(pan);
        return sendToSidecar('download_tis', { pan, password, financialYear, downloadPath });
    },

    async download26AS(pan: string, password: string, assessmentYear: string): Promise<any> {
        const downloadPath = await this.getDownloadPath(pan);
        return sendToSidecar('download_26as', { pan, password, assessmentYear, downloadPath });
    },

    // --- Event Handlers ---
    onFetchProgress(callback: (event: any, status: string) => void): void {
        progressHandler = (status) => callback(null, status);
    },

    removeAllFetchProgressListeners(): void {
        progressHandler = null;
    },

    onCaptchaRequired(callback: (event: any, data: { image: string }) => void): void {
        captchaHandler = (image) => callback(null, { image });
    },

    sendCaptchaResponse(text: string, cancelled: boolean): void {
        if (!cancelled) sendToSidecar('captcha_response', { text });
    },

    removeAllCaptchaListeners(): void {
        captchaHandler = null;
    },

    // Legacy compatibility - for updateUserDetails pattern used in pages
    async updateUserDetails(data: any): Promise<{ success: boolean; error?: string }> {
        console.log('=== updateUserDetails called ===');
        console.log('Data:', JSON.stringify(data, null, 2));

        try {
            const pan = data.pan;
            const user = data.user || {};
            await this.saveUser(pan, user, data.bankAccounts, data.jurisdiction);
            console.log('updateUserDetails: SUCCESS');
            return { success: true };
        } catch (error: any) {
            console.error('updateUserDetails: FAILED', error);
            return { success: false, error: error.message || 'Unknown error' };
        }
    }
};

// Auto-connect on load
connectSidecar();

export default api;
