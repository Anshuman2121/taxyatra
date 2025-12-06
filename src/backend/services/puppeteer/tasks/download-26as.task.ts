import { Page } from 'puppeteer-core';
import { BaseTask } from './base.task';
import { LoginTask } from './login.task';
import path from 'path';
import fs from 'fs';

export class Download26ASTask extends BaseTask {

    async execute(
        pan: string,
        password: string,
        assessmentYear: string,
        downloadPath: string
    ): Promise<{ success: boolean; filePath?: string; message?: string }> {
        let tracesPage: Page | null = null;
        try {
            const loginTask = new LoginTask(this.page, this.onProgress);
            const loginResult = await loginTask.execute(pan, password);
            if (!loginResult.success) throw new Error(loginResult.message);

            this.log(`Login successful, continuing with 26AS download for AY ${assessmentYear}`, 'success');

            const client = await this.page.createCDPSession();
            await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadPath });

            this.onProgress?.('Navigating to dashboard...');
            await this.page.goto('https://eportal.incometax.gov.in/iec/foservices/#/dashboard', { waitUntil: 'networkidle0', timeout: 60000 });
            await this.wait(3000);

            // Handle TRACES navigation
            this.onProgress?.('Navigating to View Form 26AS...');

            // e-File -> Income Tax Returns -> View Form 26AS
            await this.clickButtonByText('e-File');
            await this.wait(1000);

            // Check for Logout confirmation
            await this.handleLogoutConfirmation();

            await this.clickButtonByText('Income Tax Returns');
            await this.wait(1000);

            // Setup new tab listener before clicking
            const newTabPromise = new Promise<Page>((resolve) => {
                this.page.browser().once('targetcreated', async (target) => {
                    const newPage = await target.page();
                    if (newPage) resolve(newPage);
                });
            });

            await this.clickButtonByText('View Form 26AS');

            try {
                tracesPage = await Promise.race([
                    newTabPromise,
                    new Promise<Page>((_, reject) => setTimeout(() => reject(new Error('TRACES tab timeout')), 15000))
                ]);
            } catch (e) {
                // If it opened in same tab? Unlikely for 26AS usually.
                throw e;
            }

            if (!tracesPage) throw new Error("Failed to get TRACES Page");

            await tracesPage.bringToFront();
            const tracesClient = await tracesPage.createCDPSession();
            await tracesClient.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadPath });
            await this.wait(5000);

            // TRACES Terms
            await tracesPage.evaluate(() => {
                const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
                if (checkbox) { checkbox.checked = true; checkbox.click(); }
            });
            await this.wait(1000);

            // Click Proceed on TRACES
            await this.clickButtonByTextOnPage(tracesPage, 'Proceed');
            await this.wait(3000);

            // Click View Tax Credit
            await tracesPage.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a'));
                const viewLink = links.find(link => link.textContent?.includes('View Tax Credit') || link.textContent?.includes('Form 26AS'));
                if (viewLink) viewLink.click();
            });
            await this.wait(5000);

            // Select AY
            this.onProgress?.(`Selecting assessment year ${assessmentYear}...`);
            await tracesPage.evaluate((ay) => {
                const selects = Array.from(document.querySelectorAll('select'));
                for (const select of selects) {
                    const options = Array.from(select.options);
                    const match = options.find(opt => opt.text.includes(ay) || opt.value.includes(ay));
                    if (match) {
                        select.value = match.value;
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            }, assessmentYear);
            await this.wait(2000);

            // Select Format (Text) - matches previous logic
            await tracesPage.evaluate(() => {
                const selects = Array.from(document.querySelectorAll('select'));
                for (const select of selects) {
                    const options = Array.from(select.options);
                    const match = options.find(opt => opt.text.toLowerCase().includes('text') || opt.value.toLowerCase().includes('text'));
                    if (match) {
                        select.value = match.value;
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            });
            await this.wait(1000);

            // Download
            this.onProgress?.('Clicking download button...');
            await this.clickButtonByTextOnPage(tracesPage, 'View / Download');
            await this.wait(15000);

            // Find file
            const files = fs.readdirSync(downloadPath);
            // Sort by time
            const fileStats = files.map((file: string) => ({
                name: file,
                time: fs.statSync(path.join(downloadPath, file)).mtime.getTime()
            }));
            fileStats.sort((a, b) => b.time - a.time);

            // Simplistic check: newest file or by name
            const downloadedFile = fileStats.length > 0 ? fileStats[0].name : null;

            if (downloadedFile) {
                const filePath = path.join(downloadPath, downloadedFile);
                if (tracesPage && !tracesPage.isClosed()) await tracesPage.close();
                return { success: true, filePath };
            } else {
                throw new Error('Download completed but file not found');
            }

        } catch (error: any) {
            this.log(`26AS Download failed: ${error.message}`, 'error');
            if (tracesPage && !tracesPage.isClosed()) await tracesPage.close();
            return { success: false, message: error.message };
        }
    }

    private async handleLogoutConfirmation() {
        try {
            await this.page.evaluate(() => {
                const allText = document.body.innerText;
                if (allText.includes('Are you sure you want to Logout?')) {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const noButton = buttons.find(btn => btn.textContent?.trim() === 'No' || btn.textContent?.trim() === 'NO');
                    if (noButton) (noButton as HTMLElement).click();
                }
            });
        } catch (e) { }
    }

    private async clickButtonByTextOnPage(page: Page, text: string) {
        await page.evaluate((txt) => {
            const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));
            const match = buttons.find(b => {
                const content = (b.textContent || (b as HTMLInputElement).value || '').trim().toLowerCase();
                return content.includes(txt.toLowerCase());
            });
            if (match) (match as HTMLElement).click();
        }, text);
    }
}
