import { Page } from 'puppeteer-core';
import { BaseTask } from './base.task';
import { LoginTask } from './login.task';
import path from 'path';
import fs from 'fs';

export class DownloadAISTask extends BaseTask {

    async execute(
        pan: string,
        password: string,
        financialYear: string,
        downloadPath: string,
        captchaCallback: (image: string) => Promise<string>
    ): Promise<{ success: boolean; filePath?: string; message?: string }> {
        let aisPage: Page | null = null;
        try {
            // Login first using the LoginTask
            const loginTask = new LoginTask(this.page, this.onProgress);
            const loginResult = await loginTask.execute(pan, password);
            if (!loginResult.success) throw new Error(loginResult.message);

            this.log('Login successful, continuing with AIS download', 'success');

            // Set download behavior for main page
            const client = await this.page.createCDPSession();
            await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadPath });

            // Nav to dashboard
            this.onProgress?.('Navigating to dashboard...');
            await this.page.goto('https://eportal.incometax.gov.in/iec/foservices/#/dashboard', { waitUntil: 'networkidle0', timeout: 60000 });
            await this.wait(3000);

            // Click AIS link
            this.onProgress?.('Clicking AIS link...');

            // Setup new tab listener
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
                // Fallback check if current page redirected
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

            // Handle Modal & Captcha
            await this.handleDownloadModal(aisPage, captchaCallback, downloadPath);

            // Wait/Check File
            this.onProgress?.('Downloading file...');
            await this.wait(30000);

            const dlFiles = fs.readdirSync(downloadPath);
            const jsonFile = dlFiles.find(f => f.includes('AIS') && f.endsWith('.json'));

            if (jsonFile) {
                if (aisPage && !aisPage.isClosed()) await aisPage.close();
                return { success: true, filePath: path.join(downloadPath, jsonFile) };
            } else {
                throw new Error('File not found after download');
            }

        } catch (error: any) {
            this.log(`AIS Download failed: ${error.message}`, 'error');
            if (aisPage && !aisPage.isClosed()) await aisPage.close();
            return { success: false, message: error.message };
        }
    }

    private async handleAISPageInteractions(page: Page) {
        this.onProgress?.('Clicking AIS tab on AIS page...');
        await page.evaluate(() => {
            const allElements = Array.from(document.querySelectorAll('a, button, div, span'));
            const aisElements = allElements.filter(el => el.textContent?.trim() === 'AIS');
            for (const el of aisElements) {
                const role = el.getAttribute('role');
                const parent = el.parentElement;
                if (role === 'tab' || parent?.textContent?.includes('Instructions')) {
                    (el as HTMLElement).click();
                    return;
                }
            }
            if (aisElements.length > 0) (aisElements[0] as HTMLElement).click();
        });

        await this.wait(2000);
        this.onProgress?.('Clicking on AIS card...');

        const cardClicked = await page.evaluate(() => {
            const allCards = Array.from(document.querySelectorAll('[class*="card"]'));
            // Simplified card finding logic from previous service
            for (const card of allCards) {
                const text = (card.textContent || '').replace(/\s+/g, ' ');
                if (text.includes('Annual Information Statement') && !text.includes('Taxpayer Information Summary')) {
                    (card as HTMLElement).click();
                    return true;
                }
            }
            return false;
        });

        if (!cardClicked) throw new Error('AIS card not found');
        await this.wait(3000);
    }

    private async selectFinancialYear(page: Page, fy: string) {
        this.onProgress?.(`Selecting financial year ${fy}...`);
        // Simplified dropdown logic
        await page.evaluate((year) => {
            const buttons = Array.from(document.querySelectorAll('button'));
            // Try to open generic dropdowns
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

    private async handleDownloadModal(page: Page, captchaCallback: (image: string) => Promise<string>, downloadPath: string) {
        // Find JSON button
        await page.evaluate(() => {
            const modals = document.querySelectorAll('[role="dialog"], .modal, .dialog');
            for (const modal of modals) {
                const buttons = Array.from(modal.querySelectorAll('button'));
                const dlBtns = buttons.filter(b => b.textContent?.trim() === 'Download');
                if (dlBtns.length >= 2) dlBtns[1].click(); // JSON usually 2nd
                else if (dlBtns.length > 0) dlBtns[0].click();
            }
        });

        // Captcha
        this.log('Waiting for captcha modal...', 'info');
        this.onProgress?.('Waiting for captcha modal...');

        let modalAppeared = false;
        for (let i = 0; i < 20; i++) {
            await this.wait(1000);
            modalAppeared = await page.evaluate(() => {
                const img = document.querySelector('img[src*="captcha"], canvas, img[alt*="captcha"]');
                return !!img && (img as HTMLElement).offsetParent !== null;
            });
            if (modalAppeared) break;
        }

        const captchaImage = await page.evaluate(() => {
            const img = document.querySelector('img[src*="captcha"], img[alt*="captcha"]') as HTMLImageElement;
            if (img) return img.src;
            const canvas = document.querySelector('canvas') as HTMLCanvasElement;
            if (canvas) return canvas.toDataURL('image/png');
            return null;
        });

        if (captchaImage) {

            // Invoke callback and wait for answer
            const captchaText = await captchaCallback(captchaImage);

            // Type captcha logic (The robust one we built)
            await this.typeCaptcha(page, captchaText);

            await this.wait(2000);

            // Click Proceed
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
                const proceed = buttons.find(b => {
                    const txt = (b.textContent || (b as HTMLInputElement).value || '').toLowerCase();
                    return txt.includes('proceed') || txt.includes('submit') || txt.includes('login') || txt.includes('download');
                });
                if (proceed && !(proceed as HTMLButtonElement).disabled) {
                    (proceed as HTMLElement).click();
                }
            });

            // Post-captcha check (The fallback logic we added)
            await this.wait(5000);
            await this.checkPostCaptchaDownload(page);

        } else {
            this.onProgress?.('⚠️ Captcha not found automated, please enter manually if visible.');
        }
    }

    private async typeCaptcha(page: Page, text: string) {
        let captchaInput = null;
        try {
            captchaInput = await page.waitForSelector('input[type="text"], input[placeholder*="captcha"]', { timeout: 5000 });
        } catch {
            const handle = await page.evaluateHandle(() => document.querySelector('input[type="text"]'));
            const element = handle.asElement();
            if (element) captchaInput = element as any; // Cast to avoid Node vs Element strictness
        }

        if (captchaInput) {
            await captchaInput.click();
            await captchaInput.evaluate((el: any) => (el as HTMLInputElement).value = '');
            await this.wait(500);
            await captchaInput.type(text, { delay: 200 });
            await page.keyboard.press('Tab'); // Trigger validation
            await this.wait(1000);
        }
    }

    private async checkPostCaptchaDownload(page: Page) {
        // Fallback Logic from previous fix
        await page.evaluate(() => {
            const modal = document.querySelector('[role="dialog"], .modal, .dialog');
            if (!modal) {
                const buttons = Array.from(document.querySelectorAll('button'));
                const dlBtns = buttons.filter(b => b.textContent?.trim() === 'Download');
                if (dlBtns.length >= 2) dlBtns[1].click();
            }
        });
    }
}
