import { Page, Browser, BrowserContext } from 'playwright';
import { DownloadResponse, ProgressCallback } from './download.types';
import { NavigationHelper } from '../browser/navigation.helper';
import * as fs from 'fs';
import * as path from 'path';

export class DownloadAISService {
    /**
     * Download AIS (Annual Information Statement)
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
        console.log('📥 [AIS] Download started for F.Y.:', financialYear);

        try {
            // Step 1: Login
            onProgress?.('Logging in to Income Tax portal...');
            await this.performLogin(page, pan, password);

            console.log('✅ [AIS] Login successful, continuing with AIS download');

            // Step 2: Navigate to dashboard
            onProgress?.('Navigating to dashboard...');
            await NavigationHelper.navigateTo(page, 'https://eportal.incometax.gov.in/iec/foservices/#/dashboard');
            await NavigationHelper.delay(3000);

            // Step 3: Click AIS link to open new tab
            onProgress?.('Clicking AIS link...');
            const aisPage = await this.navigateToAIS(page, browser, onProgress);

            // Step 4: Click AIS tab on the AIS page
            onProgress?.('Clicking AIS tab...');
            await this.clickAISTab(aisPage);

            // Step 5: Click AIS card
            onProgress?.('Clicking AIS card...');
            await this.clickAISCard(aisPage);

            // Step 6: Wait for AIS page to load
            onProgress?.('Waiting for AIS page to load...');
            await NavigationHelper.delay(3000);

            // Step 7: Select financial year
            onProgress?.(`Selecting financial year ${financialYear}...`);
            await this.selectFinancialYear(aisPage, financialYear);

            // Step 8: Click download JSON button
            onProgress?.('Clicking download button...');
            await this.clickDownloadButton(aisPage);

            // Step 9: Handle captcha if it appears
            onProgress?.('Checking for captcha...');
            const captchaHandled = await this.handleCaptcha(aisPage, event, onProgress);

            if (captchaHandled) {
                onProgress?.('Captcha handled, proceeding with download...');
            }

            // Step 10: Wait for download to complete
            onProgress?.('Waiting for download to start...');
            console.log('📂 [AIS] Monitoring download directory:', downloadPath);

            // Monitor the download directory for up to 2 minutes
            let downloadedFile = null;
            const maxWaitTime = 120000; // 2 minutes max wait
            const startTime = Date.now();
            let checkCount = 0;

            while (Date.now() - startTime < maxWaitTime) {
                await NavigationHelper.delay(2000);
                checkCount++;

                try {
                    const files = fs.readdirSync(downloadPath);

                    if (checkCount % 5 === 0) {
                        console.log(`🔍 [AIS] Check #${checkCount}: Files in directory:`, files);
                    }

                    const jsonFile = files.find((file: string) =>
                        file.endsWith('.json') &&
                        (file.includes('AIS') || file.includes('ais'))
                    );

                    if (jsonFile) {
                        // Check if file is still being written (size is changing)
                        const filePath = path.join(downloadPath, jsonFile);
                        const stat1 = fs.statSync(filePath);
                        await NavigationHelper.delay(1000);
                        const stat2 = fs.statSync(filePath);

                        if (stat1.size === stat2.size && stat2.size > 0) {
                            downloadedFile = jsonFile;
                            console.log('✅ [AIS] AIS file downloaded:', downloadedFile);
                            break;
                        }
                    }
                } catch (e) {
                    // Directory might not exist yet or other error
                }
            }

            const filePath = downloadedFile ? path.join(downloadPath, downloadedFile) : null;

            if (filePath) {
                console.log('✅ [AIS] Downloaded successfully:', filePath);
                onProgress?.('✅ Download complete!');
                return { success: true, filePath };
            } else {
                throw new Error('Download completed but file not found');
            }

        } catch (error: any) {
            console.error('❌ [AIS] Download failed:', error.message);
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

        console.log('✅ [AIS] AIS link clicked');
        await NavigationHelper.delay(2000);

        // Wait for new page and find AIS page
        const pages = browser.contexts()[0].pages();
        let aisPage = pages.find(p => p.url().includes('insight.gov.in'));

        if (!aisPage) {
            // Check if current page navigated to AIS
            const currentUrl = page.url();
            if (currentUrl.includes('insight.gov.in')) {
                aisPage = page;
            } else {
                // Wait a bit more and check again
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
            console.log('✅ [AIS] AIS tab clicked');
        }
        await NavigationHelper.delay(2000);
    }

    /**
     * Click AIS card
     */
    private async clickAISCard(aisPage: Page): Promise<void> {
        const aisCardClicked = await aisPage.evaluate(() => {
            const allCards = Array.from(document.querySelectorAll('[class*="card"]'));
            let aisCardCandidates: Array<{ el: Element, text: string, length: number }> = [];

            for (const card of allCards) {
                const text = card.textContent?.trim() || '';
                const normalizedText = text.replace(/\s+/g, ' ');

                const hasAISText = normalizedText.includes('Annual Information Statement') ||
                    (normalizedText.includes('AIS') && normalizedText.includes('Annual'));
                const notTIS = !normalizedText.includes('Taxpayer Information Summary') &&
                    !(normalizedText.includes('TIS') && !normalizedText.includes('AIS'));

                if (hasAISText && notTIS) {
                    aisCardCandidates.push({ el: card, text: normalizedText, length: text.length });
                }
            }

            aisCardCandidates.sort((a, b) => a.length - b.length);

            if (aisCardCandidates.length > 0) {
                const aisCard = aisCardCandidates[0];
                if (aisCard.el instanceof HTMLElement) {
                    aisCard.el.click();
                    return true;
                }
            }

            return false;
        });

        if (!aisCardClicked) {
            throw new Error('AIS card not found');
        }

        console.log('✅ [AIS] AIS card clicked');
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
            console.log('✅ [AIS] F.Y. dropdown clicked');
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
                console.log('✅ [AIS] Financial year selected');
                await NavigationHelper.delay(2000);
            }
        }
    }

    /**
     * Click download button
     */
    private async clickDownloadButton(aisPage: Page): Promise<void> {
        // Step 1: Click the Download button on the page
        const downloadClicked = await aisPage.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
            for (const btn of buttons) {
                const text = btn.textContent?.toLowerCase() || '';

                // Look for "Download" button
                if (text === 'download' || text.includes('download')) {
                    if (btn instanceof HTMLElement) {
                        console.log(`Found download button: "${btn.textContent?.trim()}"`);
                        btn.click();
                        return true;
                    }
                }
            }
            return false;
        });

        if (!downloadClicked) {
            throw new Error('Download button not found on AIS page');
        }

        console.log('✅ [AIS] Download button clicked');
        await NavigationHelper.delay(3000);

        // Step 2: Click the JSON Download button in the modal
        console.log('🔍 [AIS] Looking for JSON Download button in modal...');
        const modalDownloadClicked = await aisPage.evaluate(() => {
            // Look for Download button in modal specifically for JSON
            const modals = document.querySelectorAll('[role="dialog"], .modal, .dialog, [class*="modal"]');
            for (const modal of modals) {
                const buttons = Array.from(modal.querySelectorAll('button'));
                const downloadButtons = buttons.filter(btn => btn.textContent?.trim() === 'Download');

                console.log(`Found ${downloadButtons.length} Download buttons in modal`);

                // Find the JSON download button - check if button is near "JSON" text
                for (let i = 0; i < downloadButtons.length; i++) {
                    const btn = downloadButtons[i];
                    const parent = btn.closest('div, section, article');
                    const parentText = parent?.textContent || '';

                    if (parentText.includes('JSON') || parentText.includes('AIS Utility')) {
                        console.log(`✅ Found JSON Download button (button ${i + 1}), clicking...`);
                        if (btn instanceof HTMLElement) {
                            btn.click();
                            return true;
                        }
                    }
                }

                // Fallback: click the 2nd Download button (index 1) for JSON
                if (downloadButtons.length >= 2 && downloadButtons[1] instanceof HTMLElement) {
                    console.log('✅ Fallback: clicking 2nd Download button for JSON...');
                    downloadButtons[1].click();
                    return true;
                }
            }
            return false;
        });

        if (!modalDownloadClicked) {
            throw new Error('JSON Download button in modal not found');
        }

        console.log('✅ [AIS] Modal JSON Download button clicked');
        await NavigationHelper.delay(2000);
    }

    /**
     * Handle captcha modal
     */
    private async handleCaptcha(aisPage: Page, event: any, onProgress?: ProgressCallback): Promise<boolean> {
        try {
            // Wait for captcha modal to appear (up to 10 seconds)
            onProgress?.('Waiting for captcha modal...');
            console.log('⏳ [AIS] Waiting for captcha modal to appear...');

            let modalAppeared = false;
            for (let i = 0; i < 10; i++) {
                await NavigationHelper.delay(1000);

                modalAppeared = await aisPage.evaluate(() => {
                    const modals = document.querySelectorAll('[role="dialog"], .modal, .dialog, [class*="modal"], [class*="dialog"]');
                    for (const modal of modals) {
                        const hasImage = modal.querySelector('img');
                        const hasInput = modal.querySelector('input[type="text"]');
                        if (hasImage && hasInput) {
                            return true;
                        }
                    }
                    return false;
                });

                if (modalAppeared) {
                    console.log(`✅ [AIS] Captcha modal appeared after ${i + 1} seconds`);
                    break;
                }
            }

            if (!modalAppeared) {
                console.log('⚠️ [AIS] Captcha modal did not appear, skipping captcha handling');
                return false;
            }

            const captchaImage = await aisPage.evaluate(() => {
                // First, log all images on the page for debugging
                const allImages = Array.from(document.querySelectorAll('img'));
                console.log('🖼️ All images on page:', allImages.map(img => ({
                    src: img.src.substring(0, 100),
                    alt: img.alt,
                    id: img.id,
                    className: img.className,
                    width: img.width,
                    height: img.height
                })));

                // Strategy 1: Look for images in modal/dialog containers (but skip SVGs and icons)
                const modals = document.querySelectorAll('[role="dialog"], .modal, .dialog, .popup, [class*="modal"], [class*="dialog"]');
                for (const modal of modals) {
                    const images = Array.from(modal.querySelectorAll('img'));
                    for (const img of images) {
                        if (!img.src.includes('.svg') && !img.src.includes('icon') &&
                            img.width > 50 && img.height > 30) {
                            console.log('✅ Found captcha in modal/dialog');
                            return img.src;
                        }
                    }
                }

                // Strategy 2: Look for canvas elements (captchas are sometimes rendered on canvas)
                const canvases = Array.from(document.querySelectorAll('canvas'));
                if (canvases.length > 0) {
                    try {
                        const canvas = canvases[0] as HTMLCanvasElement;
                        const dataUrl = canvas.toDataURL();
                        console.log('✅ Found captcha on canvas');
                        return dataUrl;
                    } catch (e) {
                        console.log('⚠️ Canvas found but could not extract:', e);
                    }
                }

                // Strategy 3: Common captcha selectors (skip SVGs)
                let img = document.querySelector('img[alt*="captcha"], img[alt*="Captcha"], img[src*="captcha"], img[id*="captcha"], img[class*="captcha"]') as HTMLImageElement;
                if (img && !img.src.includes('.svg')) {
                    console.log('✅ Found captcha via common selectors');
                    return img.src;
                }

                // Strategy 4: Look for images with "cap" in any attribute (skip SVGs)
                img = document.querySelector('img[alt*="cap"], img[id*="cap"], img[class*="cap"]') as HTMLImageElement;
                if (img && !img.src.includes('.svg')) {
                    console.log('✅ Found captcha via "cap" selectors');
                    return img.src;
                }

                // Strategy 5: Find image near text input field (skip SVGs and small images)
                const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
                for (const input of inputs) {
                    const container = input.closest('div, form, section');
                    if (container) {
                        const images = Array.from(container.querySelectorAll('img'));
                        for (const nearbyImg of images) {
                            if (!nearbyImg.src.includes('.svg') && !nearbyImg.src.includes('icon') &&
                                nearbyImg.width > 50 && nearbyImg.height > 30) {
                                console.log('✅ Found image near input field');
                                return nearbyImg.src;
                            }
                        }
                    }
                }

                // Strategy 6: Find any image that looks like a captcha (data URL or specific patterns, skip SVGs)
                for (const image of allImages) {
                    const src = image.src;
                    if (!src.includes('.svg') && !src.includes('icon') &&
                        (src.includes('data:image') || src.includes('base64') || src.includes('captcha') || src.includes('cap')) &&
                        image.width > 50 && image.height > 30) {
                        console.log('✅ Found image with captcha-like src');
                        return src;
                    }
                }

                // Strategy 7: Return first non-SVG image with reasonable dimensions
                for (const image of allImages) {
                    if (!image.src.includes('.svg') && !image.src.includes('icon') &&
                        image.width > 100 && image.height > 40) {
                        console.log('✅ Found suitable image by dimensions');
                        return image.src;
                    }
                }

                console.log('❌ No captcha image found');
                return null;
            });

            if (!captchaImage) {
                console.log('⚠️ [AIS] Captcha image not found');
                return false;
            }

            console.log('✅ [AIS] Captcha image extracted');
            onProgress?.('Please enter the captcha in the dialog...');

            // Send captcha image to frontend
            event.sender.send('download:captcha-required', { image: captchaImage });

            // Wait for captcha response from frontend
            const captchaText = await new Promise<string>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Captcha entry timeout'));
                }, 120000); // 2 minutes timeout

                const { ipcMain } = require('electron');
                ipcMain.once('download:captcha-response', (_: any, response: { text: string; cancelled: boolean }) => {
                    clearTimeout(timeout);
                    if (response.cancelled) {
                        reject(new Error('Captcha entry cancelled'));
                    } else {
                        resolve(response.text);
                    }
                });
            });

            console.log('✅ [AIS] Received captcha from user:', captchaText);
            onProgress?.('Submitting captcha...');

            // Enter captcha in the browser - look specifically in the modal
            console.log('🔍 [AIS] Looking for captcha input field in modal...');

            const inputFilled = await aisPage.evaluate((captcha: string) => {
                // Find the modal first
                const modal = document.querySelector('[role="dialog"], .modal, .dialog, [class*="modal"], [class*="dialog"]');
                if (modal) {
                    // Find input within modal
                    const input = modal.querySelector('input[type="text"]') as HTMLInputElement;
                    if (input) {
                        console.log('✅ Found input field in modal');
                        input.value = captcha;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        return true;
                    }
                }

                // Fallback: find any text input
                const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                if (input) {
                    console.log('✅ Found input field (fallback)');
                    input.value = captcha;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    return true;
                }

                console.log('❌ No input field found');
                return false;
            }, captchaText);

            if (!inputFilled) {
                console.log('⚠️ [AIS] Could not fill captcha input');
                throw new Error('Could not find captcha input field');
            }

            console.log('✅ [AIS] Captcha entered in input field');
            // Wait longer for the modal buttons to be enabled (some sites disable the button until captcha is validated)
            console.log('⏳ [AIS] Waiting for Proceed button to be enabled...');
            await NavigationHelper.delay(3000);

            // Click proceed button with multiple strategies
            onProgress?.('Clicking Proceed button...');
            let proceedClicked = false;

            // Try to find and click the Proceed button using Playwright's native methods
            try {
                // Wait for any button with "proceed", "submit", or "ok" text
                const proceedButton = aisPage.locator('button, input[type="button"], input[type="submit"]').filter({
                    hasText: /proceed|submit|ok/i
                }).first();

                if (await proceedButton.isVisible({ timeout: 5000 })) {
                    await proceedButton.click();
                    proceedClicked = true;
                    console.log('✅ [AIS] Proceed button clicked using Playwright locator');
                }
            } catch (e) {
                console.log('⚠️ [AIS] Playwright locator method failed, trying evaluate...');
            }

            // Fallback to evaluate method if Playwright click didn't work
            if (!proceedClicked) {
                // Strategy 1: Look for exact text match
                proceedClicked = await aisPage.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));
                    for (const btn of buttons) {
                        const text = ((btn as HTMLElement).textContent || (btn as HTMLInputElement).value || '').trim().toLowerCase();
                        if (text === 'proceed' || text === 'submit' || text === 'ok') {
                            if (btn instanceof HTMLElement) {
                                console.log('Clicking proceed button:', text);
                                btn.click();
                                return true;
                            }
                        }
                    }
                    return false;
                });

                if (proceedClicked) {
                    console.log('✅ [AIS] Proceed button clicked using evaluate (exact match)');
                }
            }

            // Strategy 2: Look for buttons with "proceed" in text
            if (!proceedClicked) {
                proceedClicked = await aisPage.evaluate(() => {
                    const allElements = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], div, span, a'));
                    for (const el of allElements) {
                        const text = ((el as HTMLElement).textContent || (el as HTMLInputElement).value || '').trim().toLowerCase();
                        const isVisible = (el as HTMLElement).offsetParent !== null;
                        if ((text.includes('proceed') || text.includes('submit')) && isVisible) {
                            if (el instanceof HTMLElement) {
                                console.log('Clicking element with proceed text:', text);
                                el.click();
                                el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                                return true;
                            }
                        }
                    }
                    return false;
                });

                if (proceedClicked) {
                    console.log('✅ [AIS] Proceed button clicked using evaluate (contains match)');
                }
            }

            if (proceedClicked) {
                console.log('✅ [AIS] Proceed button clicked');
                console.log('⏳ [AIS] Waiting for download to start after clicking Proceed...');
                await NavigationHelper.delay(5000); // Wait for download to start

                // Additional wait to ensure download has started
                await NavigationHelper.delay(3000);
                console.log('✅ [AIS] Waited 8 seconds total after Proceed click');
                return true;
            } else {
                console.log('⚠️ [AIS] Proceed button not found');
                return false;
            }
        } catch (error: any) {
            console.log('⚠️ [AIS] Captcha handling failed:', error);
            return false;
        }
    }

    /**
     * Find downloaded file
     */
    private async findDownloadedFile(downloadPath: string): Promise<string | null> {
        const files = fs.readdirSync(downloadPath);
        const downloadedFile = files.find((file: string) =>
            file.includes('AIS') || file.includes('ais') || file.toLowerCase().endsWith('.json')
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
