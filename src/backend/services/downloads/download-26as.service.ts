import { Page, Browser, BrowserContext } from 'playwright';
import { DownloadResponse, ProgressCallback } from './download.types';
import { NavigationHelper } from '../browser/navigation.helper';
import { DownloadHelper } from './download.helper';
import { AuthService } from '../auth/auth.service';
import * as fs from 'fs';
import * as path from 'path';

export class Download26ASService {
    /**
     * Download Form 26AS
     */
    async download(
        page: Page,
        context: BrowserContext,
        browser: Browser,
        pan: string,
        password: string,
        assessmentYear: string,
        downloadPath: string,
        onProgress?: ProgressCallback
    ): Promise<DownloadResponse> {
        console.log('📥 [26AS] Download started for AY:', assessmentYear);

        try {
            // Step 1: Login (inline simplified login for download)
            onProgress?.('Logging in to Income Tax portal...');
            await this.performLogin(page, pan, password, onProgress);

            console.log('✅ [26AS] Login successful, continuing with 26AS download');

            // Step 2: Navigate to dashboard
            onProgress?.('Navigating to dashboard...');
            await NavigationHelper.navigateTo(page, 'https://eportal.incometax.gov.in/iec/foservices/#/dashboard');
            await NavigationHelper.delay(3000);

            // Step 3: Navigate to Form 26AS
            onProgress?.('Navigating to View Form 26AS...');
            const tracesPage = await this.navigateToForm26AS(page, browser, onProgress);

            // Step 4: Handle TRACES page
            onProgress?.('Accepting TRACES terms...');
            await this.handleTracesPage(tracesPage, onProgress);

            // Step 5: Select assessment year and download
            onProgress?.(`Selecting assessment year ${assessmentYear}...`);
            await this.selectAssessmentYear(tracesPage, assessmentYear);

            onProgress?.('Selecting Text format...');
            await this.selectTextFormat(tracesPage);

            onProgress?.('Clicking download button...');
            await this.clickDownloadButton(tracesPage);

            // Step 6: Wait for download and find file
            onProgress?.('Downloading file...');
            await NavigationHelper.delay(15000);

            const filePath = await this.findDownloadedFile(downloadPath);

            if (filePath) {
                console.log('✅ [26AS] Downloaded successfully:', filePath);
                onProgress?.('✅ Download complete!');
                return { success: true, filePath };
            } else {
                throw new Error('Download completed but file not found');
            }

        } catch (error: any) {
            console.error('❌ [26AS] Download failed:', error.message);
            onProgress?.('❌ ' + error.message);
            return { success: false, message: error.message };
        }
    }

    /**
     * Perform login (simplified version for downloads)
     */
    private async performLogin(page: Page, pan: string, password: string, onProgress?: ProgressCallback): Promise<void> {
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
            console.log('⚠️ [26AS] Dual login detected, handling...');
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, a'));
                const loginHereBtn = buttons.find(el => {
                    const text = el.textContent?.trim() || '';
                    return text.toLowerCase().includes('login here');
                });
                if (loginHereBtn && loginHereBtn instanceof HTMLElement) {
                    loginHereBtn.click();
                }
            });
            await NavigationHelper.delay(3000);
        }
    }

    /**
     * Navigate to Form 26AS through menu
     */
    private async navigateToForm26AS(page: Page, browser: Browser, onProgress?: ProgressCallback): Promise<Page> {
        // Click e-File menu
        onProgress?.('Opening e-File menu...');
        const eFileBox = await page.evaluate(() => {
            const allElements = Array.from(document.querySelectorAll('a, button, span, li, div'));
            const eFileBtn = allElements.find(el => el.textContent?.trim() === 'e-File');
            if (eFileBtn) {
                const rect = eFileBtn.getBoundingClientRect();
                return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, found: true };
            }
            return null;
        });

        if (eFileBox && eFileBox.found) {
            await page.mouse.click(eFileBox.x, eFileBox.y);
        } else {
            await DownloadHelper.clickByText(page, 'e-File');
        }

        await NavigationHelper.delay(3000);

        // Dismiss logout dialog if appears
        await page.evaluate(() => {
            const allText = document.body.innerText;
            if (allText.includes('Are you sure you want to Logout?')) {
                const buttons = Array.from(document.querySelectorAll('button'));
                const noButton = buttons.find(btn => btn.textContent?.trim() === 'No' || btn.textContent?.trim() === 'NO');
                if (noButton && noButton instanceof HTMLElement) noButton.click();
            }
        });
        await NavigationHelper.delay(1000);

        // Hover over Income Tax Returns
        const itrBox = await page.evaluate(() => {
            const overlay = document.querySelector('.cdk-overlay-container');
            const searchRoot = overlay || document;
            const menuItems = Array.from(searchRoot.querySelectorAll('button, a, span, div'));
            const itrItem = menuItems.find(el => el.textContent?.trim() === 'Income Tax Returns');
            if (itrItem) {
                const rect = itrItem.getBoundingClientRect();
                return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, found: true };
            }
            return null;
        });

        if (itrBox && itrBox.found) {
            await page.mouse.move(itrBox.x, itrBox.y);
            await NavigationHelper.delay(1500);
            await page.mouse.move(itrBox.x + 5, itrBox.y);
            await NavigationHelper.delay(1500);
        } else {
            throw new Error('Income Tax Returns menu item not found');
        }

        // Click View Form 26AS
        const view26ASBox = await page.evaluate(() => {
            const overlay = document.querySelector('.cdk-overlay-container');
            const searchRoot = overlay || document;
            const allItems = Array.from(searchRoot.querySelectorAll('button, a, span, div'));
            const view26AS = allItems.find(el => el.textContent?.trim() === 'View Form 26AS');
            if (view26AS) {
                const rect = view26AS.getBoundingClientRect();
                return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, found: true };
            }
            return null;
        });

        if (view26ASBox && view26ASBox.found) {
            await page.mouse.click(view26ASBox.x, view26ASBox.y);
        } else {
            const clicked = await page.evaluate(() => {
                const overlay = document.querySelector('.cdk-overlay-container');
                const searchRoot = overlay || document;
                const allItems = Array.from(searchRoot.querySelectorAll('button, a, span, div'));
                const view26AS = allItems.find(el => el.textContent?.trim()?.includes('View Form 26AS'));
                if (view26AS && view26AS instanceof HTMLElement) {
                    view26AS.click();
                    return true;
                }
                return false;
            });
            if (!clicked) throw new Error('View Form 26AS link not found in submenu');
        }

        // Wait for TRACES tab
        let tracesPage: Page;
        try {
            // Wait for new page to be created
            await NavigationHelper.delay(2000);
            const pages = browser.contexts()[0].pages();

            // Find the TRACES page (should be the newest page)
            tracesPage = pages.find(p => p.url().includes('tdscpc.gov.in')) || pages[pages.length - 1];

            if (!tracesPage || tracesPage === page) {
                // Check if current page navigated to TRACES
                const currentUrl = page.url();
                if (currentUrl.includes('tdscpc.gov.in')) {
                    tracesPage = page;
                } else {
                    throw new Error('TRACES tab did not open');
                }
            }
        } catch (error) {
            const currentUrl = page.url();
            if (currentUrl.includes('tdscpc.gov.in')) {
                tracesPage = page;
            } else {
                throw new Error('TRACES tab did not open');
            }
        }

        await tracesPage.bringToFront();
        await NavigationHelper.delay(5000);

        return tracesPage;
    }

    /**
     * Handle TRACES page terms and navigation
     */
    private async handleTracesPage(tracesPage: Page, onProgress?: ProgressCallback): Promise<void> {
        const tracesUrl = tracesPage.url();
        console.log('📍 [26AS] TRACES page URL:', tracesUrl);

        if (tracesUrl.includes('tdscpc.gov.in') || tracesUrl.includes('traces')) {
            // Check agreement checkbox
            await tracesPage.evaluate(() => {
                const checkbox = document.querySelector('input[type="checkbox"]');
                if (checkbox && checkbox instanceof HTMLInputElement) {
                    checkbox.checked = true;
                    checkbox.click();
                }
            });
            await NavigationHelper.delay(1000);

            // Click Proceed
            await tracesPage.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, input[type="button"]'));
                const proceedBtn = buttons.find(btn => {
                    const text = (btn as HTMLElement).textContent || (btn as HTMLInputElement).value || '';
                    return text.toLowerCase().includes('proceed');
                });
                if (proceedBtn && proceedBtn instanceof HTMLElement) proceedBtn.click();
            });
            await NavigationHelper.delay(3000);

            // Click View Tax Credit link
            onProgress?.('Opening 26AS viewer...');
            await tracesPage.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a'));
                const viewLink = links.find(link =>
                    link.textContent?.includes('View Tax Credit') || link.textContent?.includes('Form 26AS')
                );
                if (viewLink) viewLink.click();
            });
            await NavigationHelper.delay(5000);
        }
    }

    /**
     * Select assessment year from dropdown
     */
    private async selectAssessmentYear(tracesPage: Page, assessmentYear: string): Promise<void> {
        const yearSelected = await tracesPage.evaluate((ay: string) => {
            const selects = Array.from(document.querySelectorAll('select'));
            for (const select of selects) {
                const options = Array.from(select.options);
                const matchingOption = options.find(opt => {
                    const yearPattern = ay.replace('-', '');
                    return opt.text.includes(ay) || opt.value.includes(ay) ||
                        opt.text.includes(yearPattern) || opt.value.includes(yearPattern);
                });
                if (matchingOption) {
                    select.value = matchingOption.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    console.log('✅ Selected assessment year:', matchingOption.text);
                    return true;
                }
            }
            return false;
        }, assessmentYear);

        if (yearSelected) {
            console.log('✅ [26AS] Assessment year selected');
            await NavigationHelper.delay(2000);
        } else {
            console.log('⚠️ [26AS] Could not find assessment year dropdown, using default');
        }
    }

    /**
     * Select Text format from dropdown
     */
    private async selectTextFormat(tracesPage: Page): Promise<void> {
        const formatSelected = await tracesPage.evaluate(() => {
            const selects = Array.from(document.querySelectorAll('select'));
            for (const select of selects) {
                const options = Array.from(select.options);
                const textOption = options.find(opt =>
                    opt.text.toLowerCase().includes('text') || opt.value.toLowerCase().includes('text')
                );
                if (textOption) {
                    select.value = textOption.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    console.log('✅ Selected format:', textOption.text);
                    return true;
                }
            }
            return false;
        });

        if (formatSelected) {
            console.log('✅ [26AS] Format selected');
            await NavigationHelper.delay(1000);
        }
    }

    /**
     * Click download button
     */
    private async clickDownloadButton(tracesPage: Page): Promise<void> {
        const downloadClicked = await tracesPage.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));
            let downloadBtn = buttons.find(btn => {
                const text = ((btn as HTMLElement).textContent || (btn as HTMLInputElement).value || '').trim();
                return text === 'View / Download' || text === 'View/Download';
            });

            if (!downloadBtn) {
                downloadBtn = buttons.find(btn => {
                    const text = ((btn as HTMLElement).textContent || (btn as HTMLInputElement).value || '').toLowerCase();
                    return text.includes('view') && text.includes('download');
                });
            }

            if (downloadBtn && downloadBtn instanceof HTMLElement) {
                downloadBtn.click();
                return true;
            }
            return false;
        });

        if (downloadClicked) {
            console.log('✅ [26AS] Download button clicked');
        }
    }

    /**
     * Find downloaded file in directory
     */
    private async findDownloadedFile(downloadPath: string): Promise<string | null> {
        const files = fs.readdirSync(downloadPath);
        console.log('📁 [26AS] Files in download directory:', files);

        let downloadedFile = files.find((file: string) =>
            file.includes('26AS') || file.includes('26as') ||
            file.includes('AnnualTaxStatement') || file.includes('TaxCredit')
        );

        if (!downloadedFile && files.length > 0) {
            const fileStats = files.map((file: string) => ({
                name: file,
                time: fs.statSync(path.join(downloadPath, file)).mtime.getTime()
            }));
            fileStats.sort((a, b) => b.time - a.time);
            downloadedFile = fileStats[0].name;
            console.log('📄 [26AS] Using most recent file:', downloadedFile);
        }

        return downloadedFile ? path.join(downloadPath, downloadedFile) : null;
    }
}
