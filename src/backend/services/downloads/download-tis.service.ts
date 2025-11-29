import { Page, Browser, BrowserContext } from 'playwright';
import { DownloadResponse, ProgressCallback } from './download.types';
import { NavigationHelper } from '../browser/navigation.helper';
import * as fs from 'fs';
import * as path from 'path';

export class DownloadTISService {
    /**
     * Download TIS (Tax Information Statement)
     */
    async download(
        page: Page,
        context: BrowserContext,
        browser: Browser,
        pan: string,
        password: string,
        financialYear: string,
        downloadPath: string,
        event: any,
        onProgress?: ProgressCallback
    ): Promise<DownloadResponse> {
        console.log('📥 [TIS] Download started for F.Y.:', financialYear);

        try {
            // Step 1: Login
            onProgress?.('Logging in to Income Tax portal...');
            await this.performLogin(page, pan, password);

            console.log('✅ [TIS] Login successful, continuing with TIS download');

            // Step 2: Navigate to dashboard
            onProgress?.('Navigating to dashboard...');
            await NavigationHelper.navigateTo(page, 'https://eportal.incometax.gov.in/iec/foservices/#/dashboard');
            await NavigationHelper.delay(3000);

            // Step 3: Click AIS link to open new tab (TIS is accessed via AIS page)
            onProgress?.('Clicking AIS link...');
            const aisPage = await this.navigateToAIS(page, browser, onProgress);

            // Step 4: Click AIS tab on the AIS page
            onProgress?.('Clicking AIS tab...');
            await this.clickAISTab(aisPage);

            // Step 5: Click TIS card
            onProgress?.('Clicking TIS card...');
            await this.clickTISCard(aisPage);

            // Step 6: Wait for TIS page to load
            onProgress?.('Waiting for TIS page to load...');
            await NavigationHelper.delay(3000);

            // Step 7: Select financial year
            onProgress?.(`Selecting financial year ${financialYear}...`);
            await this.selectFinancialYear(aisPage, financialYear);

            // Step 8: Click download button
            onProgress?.('Clicking download button...');
            await this.clickDownloadButton(aisPage);

            // Step 9: Wait for download
            onProgress?.('Downloading file...');
            await NavigationHelper.delay(10000);

            const filePath = await this.findDownloadedFile(downloadPath);

            if (filePath) {
                console.log('✅ [TIS] Downloaded successfully:', filePath);
                onProgress?.('✅ Download complete!');
                return { success: true, filePath };
            } else {
                throw new Error('Download completed but file not found');
            }

        } catch (error: any) {
            console.error('❌ [TIS] Download failed:', error.message);
            onProgress?.('❌ ' + error.message);
            return { success: false, message: error.message };
        }
    }

    /**
     * Perform login (simplified)
     */
    private async performLogin(page: Page, pan: string, password: string): Promise<void> {
        await NavigationHelper.navigateTo(page, 'https://eportal.incometax.gov.in/iec/foservices/#/login');
        await NavigationHelper.delay(5000);

        await page.waitForSelector('#panAdhaarUserId', { timeout: 15000 });
        await page.fill('#panAdhaarUserId', pan);
        await NavigationHelper.delay(1000);

        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const continueBtn = btns.find(b => b.textContent?.includes('Continue'));
            if (continueBtn && continueBtn instanceof HTMLElement) continueBtn.click();
        });
        await NavigationHelper.delay(4000);

        await page.waitForSelector('#passwordCheckBox-input', { timeout: 10000 });
        await page.click('#passwordCheckBox-input');
        await NavigationHelper.delay(1000);

        await page.waitForSelector('#loginPasswordField', { timeout: 10000 });
        await page.fill('#loginPasswordField', password);
        await NavigationHelper.delay(2000);

        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const loginBtn = btns.find(b => b.textContent?.includes('Continue'));
            if (loginBtn && loginBtn instanceof HTMLElement) loginBtn.click();
        });
        await NavigationHelper.delay(5000);

        // Handle dual login
        const pageText = await page.textContent('body');
        if (pageText?.includes('Dual Login') || (pageText?.includes('session') && pageText?.includes('active'))) {
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, a'));
                const loginHereBtn = buttons.find(el => el.textContent?.trim().toLowerCase().includes('login here'));
                if (loginHereBtn && loginHereBtn instanceof HTMLElement) loginHereBtn.click();
            });
            await NavigationHelper.delay(3000);
        }
    }

    /**
     * Navigate to AIS by clicking link on dashboard
     */
    private async navigateToAIS(page: Page, browser: Browser, onProgress?: ProgressCallback): Promise<Page> {
        // Wait for AIS link to be available
        await page.waitForFunction(
            () => {
                const elements = Array.from(document.querySelectorAll('a, button'));
                return elements.some(el => el.textContent?.trim() === 'AIS');
            },
            { timeout: 20000 }
        );

        // Click the AIS link
        await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('a, button'));
            const aisLink = elements.find(el => el.textContent?.trim() === 'AIS');
            if (aisLink && aisLink instanceof HTMLElement) {
                console.log('✅ Found AIS link, clicking...');
                aisLink.click();
            }
        });

        console.log('✅ [TIS] AIS link clicked');
        await NavigationHelper.delay(2000);

        // Wait for new page and find AIS page
        const pages = browser.contexts()[0].pages();
        let aisPage = pages.find(p => p.url().includes('insight.gov.in'));

        if (!aisPage) {
            const currentUrl = page.url();
            if (currentUrl.includes('insight.gov.in')) {
                aisPage = page;
            } else {
                await NavigationHelper.delay(3000);
                const updatedPages = browser.contexts()[0].pages();
                aisPage = updatedPages.find(p => p.url().includes('insight.gov.in')) || updatedPages[updatedPages.length - 1];
            }
        }

        if (!aisPage) {
            throw new Error('AIS tab did not open');
        }

        await aisPage.bringToFront();
        await NavigationHelper.delay(3000);

        return aisPage;
    }

    /**
     * Click AIS tab on the AIS page
     */
    private async clickAISTab(aisPage: Page): Promise<void> {
        const aisTabClicked = await aisPage.evaluate(() => {
            const allElements = Array.from(document.querySelectorAll('a, button, div, span'));
            const aisElements = allElements.filter(el => el.textContent?.trim() === 'AIS');

            for (const el of aisElements) {
                const role = el.getAttribute('role');
                const parent = el.parentElement;

                if (role === 'tab' || parent?.textContent?.includes('Instructions')) {
                    if (el instanceof HTMLElement) {
                        el.click();
                        return true;
                    }
                }
            }

            // Fallback: click the first AIS element
            if (aisElements.length > 0 && aisElements[0] instanceof HTMLElement) {
                aisElements[0].click();
                return true;
            }

            return false;
        });

        if (aisTabClicked) {
            console.log('✅ [TIS] AIS tab clicked');
        }
        await NavigationHelper.delay(2000);
    }

    /**
     * Click TIS card
     */
    private async clickTISCard(aisPage: Page): Promise<void> {
        const tisCardClicked = await aisPage.evaluate(() => {
            const allCards = Array.from(document.querySelectorAll('[class*="card"]'));
            let tisCardCandidates: Array<{ el: Element, text: string, length: number }> = [];

            for (const card of allCards) {
                const text = card.textContent?.trim() || '';
                const normalizedText = text.replace(/\s+/g, ' ');

                const hasTISText = normalizedText.includes('Taxpayer Information Summary') ||
                    (normalizedText.includes('TIS') && normalizedText.includes('Taxpayer'));
                const notAIS = !normalizedText.includes('Annual Information Statement') &&
                    !(normalizedText.includes('AIS') && !normalizedText.includes('TIS'));

                if (hasTISText && notAIS) {
                    tisCardCandidates.push({ el: card, text: normalizedText, length: text.length });
                }
            }

            tisCardCandidates.sort((a, b) => a.length - b.length);

            if (tisCardCandidates.length > 0) {
                const tisCard = tisCardCandidates[0];
                if (tisCard.el instanceof HTMLElement) {
                    tisCard.el.click();
                    return true;
                }
            }

            return false;
        });

        if (!tisCardClicked) {
            throw new Error('TIS card not found');
        }

        console.log('✅ [TIS] TIS card clicked');
        await NavigationHelper.delay(3000);
    }

    /**
     * Select financial year
     */
    private async selectFinancialYear(aisPage: Page, financialYear: string): Promise<void> {
        // Click the F.Y. dropdown
        const dropdownClicked = await aisPage.evaluate(() => {
            const appDropdown = document.querySelector('app-dropdown-btn');
            if (appDropdown) {
                const button = appDropdown.querySelector('button');
                if (button && button instanceof HTMLElement) {
                    button.click();
                    return true;
                }
            }

            // Fallback: look for any element with F.Y. text
            const allElements = Array.from(document.querySelectorAll('button, select, [role="combobox"]'));
            for (const el of allElements) {
                const text = el.textContent?.trim() || '';
                if (text.includes('F.Y.') && text.match(/20\d{2}-\d{2}/)) {
                    if (el instanceof HTMLElement) {
                        el.click();
                        return true;
                    }
                }
            }

            return false;
        });

        if (dropdownClicked) {
            console.log('✅ [TIS] F.Y. dropdown clicked');
            await NavigationHelper.delay(3000);

            // Select the specific year
            const optionSelected = await aisPage.evaluate((fy: string) => {
                const options = Array.from(document.querySelectorAll('button.dropdown-item, mat-option, [role="option"], li, option'));
                for (const option of options) {
                    const text = option.textContent?.trim() || '';
                    if (text.includes(fy)) {
                        if (option instanceof HTMLElement) {
                            option.click();
                            return true;
                        }
                    }
                }
                return false;
            }, financialYear);

            if (optionSelected) {
                console.log('✅ [TIS] Financial year selected');
                await NavigationHelper.delay(2000);
            }
        }
    }

    /**
     * Click download button
     */
    private async clickDownloadButton(aisPage: Page): Promise<void> {
        // First, click the Download button on the page
        const downloadButtonClicked = await aisPage.evaluate(() => {
            const allButtons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
            for (const btn of allButtons) {
                const btnText = btn.textContent?.trim() || '';
                const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
                const title = btn.getAttribute('title')?.toLowerCase() || '';

                const hasDownloadText = btnText.toLowerCase().includes('download');
                const hasDownloadAttr = ariaLabel.includes('download') || title.includes('download');

                if ((hasDownloadText || hasDownloadAttr) && btn instanceof HTMLElement) {
                    console.log(`Found Download button: text="${btnText}"`);
                    btn.click();
                    return true;
                }
            }
            return false;
        });

        if (!downloadButtonClicked) {
            throw new Error('Download button not found on TIS page');
        }

        console.log('✅ [TIS] Download button clicked');
        await NavigationHelper.delay(2000);

        // Second, click the Download button inside the modal
        const modalDownloadClicked = await aisPage.evaluate(() => {
            const modals = document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="dialog"]');
            for (const modal of modals) {
                const isVisible = (modal as HTMLElement).offsetParent !== null;
                if (!isVisible) continue;

                const buttons = modal.querySelectorAll('button');
                for (const btn of buttons) {
                    const text = btn.textContent?.trim() || '';
                    if (text.toLowerCase().includes('download') && btn instanceof HTMLElement) {
                        btn.click();
                        return true;
                    }
                }
            }
            return false;
        });

        if (modalDownloadClicked) {
            console.log('✅ [TIS] Modal download button clicked');
        } else {
            console.log('⚠️ [TIS] Modal download button not found, proceeding anyway...');
        }

        await NavigationHelper.delay(2000);
    }

    /**
     * Find downloaded file
     */
    private async findDownloadedFile(downloadPath: string): Promise<string | null> {
        const files = fs.readdirSync(downloadPath);
        const downloadedFile = files.find((file: string) =>
            file.includes('TIS') || file.includes('tis')
        );

        if (!downloadedFile && files.length > 0) {
            const fileStats = files.map((file: string) => ({
                name: file,
                time: fs.statSync(path.join(downloadPath, file)).mtime.getTime()
            }));
            fileStats.sort((a, b) => b.time - a.time);
            return path.join(downloadPath, fileStats[0].name);
        }

        return downloadedFile ? path.join(downloadPath, downloadedFile) : null;
    }
}
