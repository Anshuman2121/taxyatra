import { Page } from 'puppeteer-core';
import { BaseTask } from './base.task';

export class LoginTask extends BaseTask {

    async execute(pan: string, password: string): Promise<{ success: boolean; cookies?: any[]; message?: string }> {
        try {
            this.onProgress?.('Logging in to Income Tax portal...');
            this.log(`Performing login for PAN: ${pan}`, 'info');

            // Navigate to login page
            await this.page.goto('https://eportal.incometax.gov.in/iec/foservices/#/login', {
                waitUntil: 'domcontentloaded', // networkidle0 is too strict for Windows/slow networks
                timeout: 30000 // Reduced timeout to fail faster if genuine issue
            });

            this.log('Navigated to login page (domcontentloaded)', 'info');
            // Wait for key element instead of arbitrary sleep
            const panField = await this.waitForSelector('#panAdhaarUserId', 20000);
            if (!panField) {
                this.log('PAN field not found after navigation', 'error');
                throw new Error('Login page did not load correctly (PAN field missing)');
            }
            this.log('✅ PAN field detected', 'info');

            await this.wait(1000);

            // Enter PAN
            const panInput = await this.waitForSelector('#panAdhaarUserId', 15000);
            if (!panInput) throw new Error('PAN input field not found');

            await this.page.type('#panAdhaarUserId', pan);
            await this.wait(1000);

            // Click Continue
            await this.clickButtonByText('Continue');
            await this.wait(4000);

            // Check secure access checkbox
            try {
                await this.page.waitForSelector('#passwordCheckBox-input', { timeout: 10000 });
                await this.page.click('#passwordCheckBox-input');
            } catch (e) {
                // Sometimes might differ?
                this.log('Checkbox not found or timeout', 'warn');
            }
            await this.wait(1000);

            // Enter password
            await this.page.type('#loginPasswordField', password);
            await this.wait(1000);

            // Click Login (Continue)
            await this.clickButtonByText('Continue');
            await this.wait(5000);

            // Handle Dual Login
            await this.handleDualLogin();

            // Verify
            if (await this.isLoggedIn()) {
                this.log('Login successful', 'success');
                const cookies = await this.page.cookies();
                return { success: true, cookies };
            } else {
                throw new Error('Login failed - no dashboard indicators');
            }

        } catch (error: any) {
            this.log(`Login task failed: ${error.message}`, 'error');
            return { success: false, message: error.message };
        }
    }
}
