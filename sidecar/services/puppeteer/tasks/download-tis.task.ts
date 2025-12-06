import { Page } from 'puppeteer-core';
import { BaseTask } from './base.task';
import { LoginTask } from './login.task';
import path from 'path';
import fs from 'fs';

export class DownloadTISTask extends BaseTask {

    async execute(
        pan: string,
        password: string,
        financialYear: string,
        downloadPath: string
    ): Promise<{ success: boolean; filePath?: string; message?: string }> {
        let aisPage: Page | null = null;
        try {
            const loginTask = new LoginTask(this.page, this.onProgress);
            const loginResult = await loginTask.execute(pan, password);
            if (!loginResult.success) throw new Error(loginResult.message);

            this.log('Login successful, continuing with TIS download', 'success');

            const client = await this.page.createCDPSession();
            await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadPath });

            this.onProgress?.('Navigating to dashboard...');
            await this.page.goto('https://eportal.incometax.gov.in/iec/foservices/#/dashboard', { waitUntil: 'networkidle0', timeout: 60000 });
            await this.wait(3000);

            this.onProgress?.('Clicking AIS link...');

            const newTabPromise = new Promise<Page>((resolve) => {
                this.page.browser().once('targetcreated', async (target) => {
                    const newPage = await target.page();
                    if (newPage) resolve(newPage);
                });
            });

            await this.clickButtonByText('AIS');

            try {
                aisPage = await Promise.race([
                    newTabPromise,
                    new Promise<Page>((_, reject) => setTimeout(() => reject(new Error('AIS tab timeout')), 15000))
                ]);
            } catch (e) {
                if (this.page.url().includes('insight.gov.in')) aisPage = this.page;
                else throw e;
            }

            if (!aisPage) throw new Error("Failed to get AIS Page");

            await aisPage.bringToFront();
            const aisClient = await aisPage.createCDPSession();
            await aisClient.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadPath });
            await this.wait(3000);

            // Handle AIS Internal Page interactions
            await this.handleAISPageInteractions(aisPage);

            // Select FY
            await this.selectFinancialYear(aisPage, financialYear);

            // Click Download
            this.onProgress?.('Clicking Download button...');
            await this.clickDownloadButton(aisPage);
            await this.wait(3000);

            // Wait for download
            this.onProgress?.('Downloading file...');
            await this.wait(30000);

            // Find file (looking for TIS)
            const dlFiles = fs.readdirSync(downloadPath);
            const jsonFile = dlFiles.find(f => (f.includes('TIS') || f.includes('Taxpayer')) && f.endsWith('.json'));

            if (jsonFile) {
                if (aisPage && !aisPage.isClosed()) await aisPage.close();
                return { success: true, filePath: path.join(downloadPath, jsonFile) };
            } else {
                if (aisPage && !aisPage.isClosed()) await aisPage.close();
                // TIS usually doesn't have captcha, but if it fails, maybe we missed it?
                // For now assuming standard flow.
                throw new Error('File not found after download');
            }

        } catch (error: any) {
            this.log(`TIS Download failed: ${error.message}`, 'error');
            if (aisPage && !aisPage.isClosed()) await aisPage.close();
            return { success: false, message: error.message };
        }
    }

    private async handleAISPageInteractions(page: Page) {
        this.onProgress?.('Clicking AIS tab on AIS page...');
        await page.evaluate(() => {
            const allElements = Array.from(document.querySelectorAll('a, button, div, span'));
            const aisElements = allElements.filter(el => el.textContent?.trim() === 'AIS');
            if (aisElements.length > 0) (aisElements[0] as HTMLElement).click();
        });

        await this.wait(2000);
        this.onProgress?.('Clicking on TIS card...');

        const cardClicked = await page.evaluate(() => {
            const allCards = Array.from(document.querySelectorAll('[class*="card"]'));
            for (const card of allCards) {
                const text = (card.textContent || '').replace(/\s+/g, ' ');
                if (text.includes('Taxpayer Information Summary') || text.includes('TIS')) {
                    (card as HTMLElement).click();
                    return true;
                }
            }
            return false;
        });

        if (!cardClicked) throw new Error('TIS card not found');
        await this.wait(3000);
    }

    private async selectFinancialYear(page: Page, fy: string) {
        this.onProgress?.(`Selecting financial year ${fy}...`);
        await page.evaluate((year) => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const dropdownInvokers = buttons.filter(b => b.classList.contains('dropdown-toggle') || b.parentElement?.tagName === 'APP-DROPDOWN-BTN');
            dropdownInvokers.forEach(b => b.click());
        }, fy);

        await this.wait(1000);

        await page.evaluate((year) => {
            const options = Array.from(document.querySelectorAll('li, option, mat-option, button.dropdown-item'));
            const match = options.find(o => o.textContent?.includes(year));
            if (match && match instanceof HTMLElement) match.click();
        }, fy);
        await this.wait(2000);
    }

    private async clickDownloadButton(page: Page) {
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const btn = buttons.find(b => b.textContent?.trim().includes('Download'));
            if (btn) btn.click();
        });
    }
}
