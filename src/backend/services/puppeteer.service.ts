import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
// import { Browser, Page } from 'puppeteer';

puppeteer.use(StealthPlugin());

export class PuppeteerService {
    private abortController: AbortController | null = null;

    async login(pan: string, password: string, onProgress?: (status: string) => void): Promise<{ success: boolean; cookies?: any[]; authToken?: string; message?: string }> {
        console.log('🤖 [Puppeteer] Login started for PAN:', pan);

        this.abortController = new AbortController();

        onProgress?.('Starting browser...');

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
        });

        try {
            if (this.abortController.signal.aborted) throw new Error('Cancelled');

            const page = await browser.newPage();
            await page.evaluateOnNewDocument(() => {
                // @ts-ignore
                delete navigator.__proto__.webdriver;
            });

            onProgress?.('Navigating to login page...');
            await page.goto('https://eportal.incometax.gov.in/iec/foservices/#/login', {
                waitUntil: 'networkidle0',
                timeout: 60000
            });

            if (this.abortController.signal.aborted) throw new Error('Cancelled');
            await new Promise(resolve => setTimeout(resolve, 5000));

            onProgress?.('Entering PAN...');
            await page.waitForSelector('#panAdhaarUserId');
            await page.type('#panAdhaarUserId', pan);
            await new Promise(resolve => setTimeout(resolve, 2000));

            if (this.abortController.signal.aborted) throw new Error('Cancelled');
            // Setup response listener before clicking to capture PAN validation details
            const validationResponsePromise = page.waitForResponse(async (res): Promise<boolean> => {
                try {
                    const req = res.request();
                    if (req.method() !== 'POST') return false;
                    const text = await res.text();
                    return text.includes('"entityType":"PAN"') || text.includes('"entityType": "PAN"');
                } catch (e) {
                    return false;
                }
            }, { timeout: 8000 }).catch((): any => null); // Catch timeout and return null

            onProgress?.('Clicking Continue...');
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const continueBtn = btns.find(b => b.textContent?.includes('Continue'));
                if (continueBtn) continueBtn.click();
            });

            // Check the validation response
            const validationResponse = await validationResponsePromise;
            if (validationResponse) {
                try {
                    const data = await validationResponse.json();
                    console.log('🔎 [Puppeteer] PAN Validation Response:', JSON.stringify(data));

                    if (data.secLoginOptions && data.secLoginOptions.trim() !== '') {
                        console.error(`❌ [Puppeteer] Security option enabled: ${data.secLoginOptions}`);
                        throw new Error(`Cannot able to fetch profile: ${data.secLoginOptions} is enabled. Remove this first to use`);
                    }
                } catch (e: any) {
                    // Rethrow our specific error
                    if (e.message && e.message.includes('Cannot able to fetch profile')) {
                        throw e;
                    }
                    console.log('⚠️ [Puppeteer] Error parsing validation response:', e.message);
                }
            } else {
                console.log('⚠️ [Puppeteer] Validation response not captured (timeout), proceeding...');
            }

            await new Promise(resolve => setTimeout(resolve, 4000));

            if (this.abortController.signal.aborted) throw new Error('Cancelled');
            onProgress?.('Checking secure access checkbox...');
            await page.waitForSelector('#passwordCheckBox-input');
            await page.click('#passwordCheckBox-input');
            await new Promise(resolve => setTimeout(resolve, 1000));

            if (this.abortController.signal.aborted) throw new Error('Cancelled');
            onProgress?.('Entering password...');
            await page.waitForSelector('#loginPasswordField');
            await page.type('#loginPasswordField', password);
            await new Promise(resolve => setTimeout(resolve, 2000));

            if (this.abortController.signal.aborted) throw new Error('Cancelled');
            onProgress?.('Clicking Login...');
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const loginBtn = btns.find(b => b.textContent?.includes('Continue'));
                if (loginBtn) loginBtn.click();
            });

            await new Promise(resolve => setTimeout(resolve, 3000));

            if (this.abortController.signal.aborted) throw new Error('Cancelled');
            const pageText = await page.evaluate(() => document.body.innerText);
            if (pageText.includes('Dual Login') || (pageText.includes('session') && pageText.includes('active'))) {
                console.log('⚠️  [Puppeteer] Dual login detected');
                onProgress?.('Dual login detected, handling session...');

                // Click "Login Here" button
                const clicked = await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button, a'));
                    const loginHereBtn = buttons.find(el => {
                        const text = el.textContent?.trim() || '';
                        return text === 'Login Here' || text.toLowerCase().includes('login here');
                    }) as HTMLElement;

                    if (loginHereBtn) {
                        console.log('Found Login Here button, clicking...');
                        loginHereBtn.click();
                        return true;
                    }
                    return false;
                });

                if (clicked) {
                    // Wait for navigation/dashboard to appear instead of fixed delay
                    try {
                        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
                    } catch (e) {
                        // If navigation doesn't happen, wait a bit and continue
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                } else {
                    console.log('⚠️ [Puppeteer] Login Here button not found');
                }
            }

            if (this.abortController.signal.aborted) throw new Error('Cancelled');
            const errorCheck = await page.evaluate(() => document.body.innerText);
            if (errorCheck.includes('Invalid') || errorCheck.includes('incorrect')) {
                console.error('❌ [Puppeteer] Invalid credentials');
                throw new Error('Invalid PAN or password');
            }

            // Wait for dashboard to load
            try {
                await page.waitForFunction(
                    () => document.body.innerText.includes('Dashboard') || document.body.innerText.includes('Welcome') || window.location.href.includes('dashboard'),
                    { timeout: 15000 }
                );
                console.log('✅ [Puppeteer] Dashboard detected');
            } catch (e) {
                console.log('⚠️ [Puppeteer] Dashboard wait timed out, proceeding anyway...');
            }

            // Wait longer for AuthToken to be set after dashboard loads
            await new Promise(resolve => setTimeout(resolve, 10000));

            // Aggressive polling for AuthToken
            console.log('🕵️ [Puppeteer] Starting aggressive search for AuthToken...');
            let authToken: any = null;
            let cookies: any[] = [];

            for (let attempt = 1; attempt <= 10; attempt++) {
                console.log(`  → Attempt ${attempt}/10 to find AuthToken...`);

                // 1. Get cookies from Puppeteer - check multiple domain variations
                cookies = await page.cookies(
                    'https://eportal.incometax.gov.in',
                    'https://www.incometax.gov.in',
                    'https://incometax.gov.in'
                );
                authToken = cookies.find(c => c.name === 'AuthToken');

                if (authToken) {
                    console.log('  ✅ Found AuthToken via page.cookies()!');
                    break;
                }

                // 2. Check document.cookie directly
                const docCookies = await page.evaluate(() => document.cookie);
                console.log(`  📄 document.cookie: ${docCookies.substring(0, 100)}...`); // Log start of cookies
                if (docCookies.includes('AuthToken=')) {
                    console.log('  ✅ Found AuthToken in document.cookie!');
                    const match = docCookies.match(/AuthToken=([^;]+)/);
                    if (match && match[1]) {
                        authToken = {
                            name: 'AuthToken',
                            value: match[1],
                            domain: '.incometax.gov.in',
                            path: '/',
                            httpOnly: true,
                            secure: true
                        };
                        cookies.push(authToken);
                        break;
                    }
                }

                // 3. Wait longer before next attempt (3 seconds instead of 2)
                if (attempt < 10) await new Promise(resolve => setTimeout(resolve, 3000));
            }

            // If still missing and on dashboard, try reload
            if (!authToken) {
                const pageContent = await page.content();
                if (pageContent.includes('Dashboard') || pageContent.includes('Welcome') || pageContent.includes('My Account')) {
                    console.log('⚠️ [Puppeteer] Dashboard visible but AuthToken missing. Reloading page...');
                    await page.reload({ waitUntil: 'networkidle0' });
                    await new Promise(resolve => setTimeout(resolve, 5000));

                    // One last check after reload
                    cookies = await page.cookies('https://eportal.incometax.gov.in', 'https://www.incometax.gov.in');
                    authToken = cookies.find(c => c.name === 'AuthToken');
                    if (authToken) console.log('✅ [Puppeteer] AuthToken found after reload!');
                }
            }

            // Debug log
            console.log('🍪 [Puppeteer] Final cookie count:', cookies.length);
            if (authToken) console.log('✅ [Puppeteer] AuthToken captured:', authToken.value.substring(0, 10) + '...');

            let capturedTokenFromNetwork = '';

            // Setup network interception to capture token from headers if not in cookies
            if (!authToken) {
                console.log('🔍 [Puppeteer] AuthToken cookie missing, waiting for network activity...');
                // Wait a bit for any background requests
                try {
                    const token = await page.waitForResponse(async (response): Promise<boolean> => {
                        const req = response.request();
                        const headers = req.headers();
                        // Check common auth headers
                        if (headers['authorization'] || headers['auth-token'] || headers['authtoken']) {
                            console.log('🎯 [Puppeteer] Found auth header in request to:', req.url());
                            capturedTokenFromNetwork = headers['authorization'] || headers['auth-token'] || headers['authtoken'];
                            return true;
                        }
                        return false;
                    }, { timeout: 5000 }).catch((): null => null);
                } catch (e) {
                    console.log('⚠️ [Puppeteer] No auth headers found in network traffic');
                }
            }

            // If cookie not found, try to find token in Local/Session Storage
            if (!authToken && !capturedTokenFromNetwork) {
                console.log('🔍 [Puppeteer] Checking Local/Session Storage for ANY data...');
                const storageData = await page.evaluate(() => {
                    const local: Record<string, string> = {};
                    const session: Record<string, string> = {};

                    // Dump EVERYTHING to see what we have
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key) local[key] = localStorage.getItem(key) || '';
                    }

                    for (let i = 0; i < sessionStorage.length; i++) {
                        const key = sessionStorage.key(i);
                        if (key) session[key] = sessionStorage.getItem(key) || '';
                    }
                    return { local, session };
                });

                console.log('📦 [Puppeteer] Storage Dump:', JSON.stringify(storageData, null, 2));

                // Try to find token in the dump
                // Sometimes it's inside a JSON object string
                const allValues = [...Object.values(storageData.local), ...Object.values(storageData.session)];
                for (const val of allValues) {
                    if (val.includes('eyJh') || val.length > 50) { // JWTs start with eyJh usually
                        console.log('❓ [Puppeteer] Potential token found in storage:', val.substring(0, 20) + '...');
                    }
                }
            }

            if (authToken || capturedTokenFromNetwork) {
                await browser.close();
                const tokenVal = authToken ? authToken.value : capturedTokenFromNetwork;
                console.log('✅ [Puppeteer] Login successful - AuthToken captured');
                onProgress?.('✅ Login successful! AuthToken captured');

                // If we got it from network, we might need to inject it as a cookie for the API service
                if (!authToken && capturedTokenFromNetwork) {
                    cookies.push({
                        name: 'AuthToken',
                        value: capturedTokenFromNetwork,
                        domain: '.incometax.gov.in',
                        path: '/',
                        httpOnly: true,
                        secure: true,
                        expires: -1,
                        size: capturedTokenFromNetwork.length + 9, // "AuthToken".length + value length
                        session: true,
                        priority: 'Medium',
                        sameParty: false,
                        sourceScheme: 'Secure',
                        partitionKey: undefined // Add partitionKey if needed by the type definition, usually optional
                    } as any); // Cast to any to avoid strict type checking against Protocol.Network.Cookie if minor optional fields are missing
                }

                return { success: true, cookies, authToken: tokenVal };
            } else {
                console.warn('⚠️ [Puppeteer] No AuthToken cookie found');
                console.log('📋 [Puppeteer] Available cookies:', JSON.stringify(cookies.map(c => ({ name: c.name, domain: c.domain })), null, 2));

                // Check if login was actually successful by checking page content BEFORE closing browser
                const finalPageContent = await page.evaluate(() => document.body.innerText);
                console.log('📄 [Puppeteer] Checking page content for success indicators...');

                await browser.close();

                if (finalPageContent.includes('Dashboard') || finalPageContent.includes('Welcome') || finalPageContent.includes('My Account') || finalPageContent.includes('e-Filing')) {
                    console.log('✅ [Puppeteer] Login appears successful (found dashboard indicators), returning all cookies');
                    onProgress?.('✅ Login successful! Session cookies captured');
                    return { success: true, cookies };
                }

                console.error('❌ [Puppeteer] Login failed - no success indicators found on page');
                onProgress?.('❌ Login failed - no AuthToken received');
                throw new Error('Login failed - no AuthToken received');
            }
        } catch (error: any) {
            console.error('\n========================================');
            console.error('❌ [Puppeteer] Login failed!');
            console.error('Error:', error.message);
            console.error('========================================\n');
            await browser.close();
            console.log('🚪 [Puppeteer] Browser closed after error');
            if (error.message !== 'Cancelled') {
                onProgress?.('❌ ' + error.message);
                return { success: false, message: error.message };
            }
            throw error; // Re-throw 'Cancelled' error
        }
    }

    abort() {
        this.abortController?.abort();
    }

    async download26AS(
        cookies: any[],
        assessmentYear: string,
        downloadPath: string,
        onProgress?: (status: string) => void
    ): Promise<{ success: boolean; filePath?: string; message?: string }> {
        console.log('📥 [Puppeteer] 26AS Download started for AY:', assessmentYear);

        const browser = await puppeteer.launch({
            headless: true, // Show browser for debugging
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            const page = await browser.newPage();

            // Set download behavior
            const client = await page.createCDPSession();
            await client.send('Page.setDownloadBehavior', {
                behavior: 'allow',
                downloadPath: downloadPath
            });

            // Set cookies to maintain session
            onProgress?.('Setting up session...');
            for (const cookie of cookies) {
                try {
                    await page.setCookie(cookie);
                } catch (e) {
                    console.log('⚠️ [Puppeteer] Cookie set error:', e);
                }
            }

            // Navigate to dashboard
            onProgress?.('Navigating to dashboard...');
            await page.goto('https://eportal.incometax.gov.in/iec/foservices/#/dashboard', {
                waitUntil: 'networkidle0',
                timeout: 60000
            });

            await new Promise(resolve => setTimeout(resolve, 3000));

            // Click on e-File menu
            onProgress?.('Opening e-File menu...');
            await page.evaluate(() => {
                const menuItems = Array.from(document.querySelectorAll('*'));
                const eFileMenu = menuItems.find(el => el.textContent?.trim() === 'e-File');
                if (eFileMenu && eFileMenu instanceof HTMLElement) {
                    eFileMenu.click();
                }
            });

            await new Promise(resolve => setTimeout(resolve, 2000));

            // Click on "Income Tax Returns" submenu
            onProgress?.('Navigating to Income Tax Returns...');
            await page.evaluate(() => {
                const menuItems = Array.from(document.querySelectorAll('*'));
                const itrMenu = menuItems.find(el => el.textContent?.trim() === 'Income Tax Returns');
                if (itrMenu && itrMenu instanceof HTMLElement) {
                    itrMenu.click();
                }
            });

            await new Promise(resolve => setTimeout(resolve, 2000));

            // Click on "View Form 26AS" - this opens a NEW TAB
            onProgress?.('Clicking View Form 26AS...');

            // Set up listener for new tab BEFORE clicking
            const newTabPromise = new Promise<any>((resolve) => {
                browser.once('targetcreated', async (target) => {
                    const newPage = await target.page();
                    resolve(newPage);
                });
            });

            // Click the link
            await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('*'));
                const view26AS = links.find(el => el.textContent?.includes('View Form 26AS'));
                if (view26AS && view26AS instanceof HTMLElement) {
                    console.log('✅ Clicking View Form 26AS');
                    view26AS.click();
                }
            });

            // Wait for new TRACES tab to open
            onProgress?.('Waiting for TRACES tab...');
            let tracesPage;
            try {
                tracesPage = await Promise.race([
                    newTabPromise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error('TRACES tab timeout')), 10000))
                ]);
                console.log('✅ [Puppeteer] TRACES tab opened');
            } catch (error) {
                // If new tab didn't open, check if we're already on TRACES page
                const currentUrl = page.url();
                if (currentUrl.includes('tdscpc.gov.in')) {
                    console.log('✅ [Puppeteer] Already on TRACES page (same tab)');
                    tracesPage = page;
                } else {
                    throw new Error('TRACES tab did not open');
                }
            }

            // Switch to TRACES tab
            await tracesPage.bringToFront();

            // Set download behavior for TRACES tab
            const tracesClient = await tracesPage.createCDPSession();
            await tracesClient.send('Page.setDownloadBehavior', {
                behavior: 'allow',
                downloadPath: downloadPath
            });

            // Wait for TRACES page to load
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Check if we're on TRACES page and accept terms
            const currentUrl = tracesPage.url();
            if (currentUrl.includes('tdscpc.gov.in')) {
                console.log('✅ [Puppeteer] On TRACES page');
                onProgress?.('Accepting TRACES terms...');

                // Check the agreement checkbox
                await tracesPage.evaluate(() => {
                    const checkbox = document.querySelector('input[type="checkbox"]');
                    if (checkbox && checkbox instanceof HTMLInputElement) {
                        checkbox.checked = true;
                        checkbox.click();
                    }
                });

                await new Promise(resolve => setTimeout(resolve, 1000));

                // Click Proceed button
                await tracesPage.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button, input[type="button"]'));
                    const proceedBtn = buttons.find(btn => {
                        const text = (btn as HTMLElement).textContent || (btn as HTMLInputElement).value || '';
                        return text.toLowerCase().includes('proceed');
                    });
                    if (proceedBtn && proceedBtn instanceof HTMLElement) {
                        proceedBtn.click();
                    }
                });

                await new Promise(resolve => setTimeout(resolve, 3000));

                // Click "View Tax Credit (Form 26AS/Annual Tax Statement)"
                onProgress?.('Opening 26AS viewer...');
                await tracesPage.evaluate(() => {
                    const links = Array.from(document.querySelectorAll('a'));
                    const viewLink = links.find(link =>
                        link.textContent?.includes('View Tax Credit') ||
                        link.textContent?.includes('Form 26AS')
                    );
                    if (viewLink) {
                        viewLink.click();
                    }
                });

                await new Promise(resolve => setTimeout(resolve, 5000));
            }

            // Now we should be on the 26AS page - look for download options
            onProgress?.('Looking for download options...');

            // Select assessment year from dropdown
            onProgress?.(`Selecting assessment year ${assessmentYear}...`);
            const yearSelected = await tracesPage.evaluate((ay: string) => {
                const selects = Array.from(document.querySelectorAll('select'));
                for (const select of selects) {
                    // Look for the assessment year select
                    const options = Array.from(select.options);
                    const matchingOption = options.find(opt => {
                        // Match patterns like "2024-25" or "2024-2025"
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
                console.log('✅ [Puppeteer] Assessment year selected');
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                console.log('⚠️ [Puppeteer] Could not find assessment year dropdown, using default');
            }

            // Select "Text" format from "View As" dropdown
            onProgress?.('Selecting Text format...');
            const formatSelected = await tracesPage.evaluate(() => {
                const selects = Array.from(document.querySelectorAll('select'));
                for (const select of selects) {
                    const options = Array.from(select.options);
                    // Look for "Text" option in View As dropdown
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
                console.log('✅ [Puppeteer] Format selected');
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                console.log('⚠️ [Puppeteer] Could not find format dropdown, using default');
            }

            // Click "View/Download" button
            onProgress?.('Clicking download button...');
            const downloadClicked = await tracesPage.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a'));
                const downloadBtn = buttons.find(btn => {
                    const text = ((btn as HTMLElement).textContent || (btn as HTMLInputElement).value || '').toLowerCase();
                    return (text.includes('view') && text.includes('download')) ||
                        text.includes('download') ||
                        text.includes('view/download');
                });
                if (downloadBtn && downloadBtn instanceof HTMLElement) {
                    console.log('✅ Found download button:', (downloadBtn as HTMLElement).textContent || (downloadBtn as HTMLInputElement).value);
                    downloadBtn.click();
                    return true;
                }
                return false;
            });

            if (!downloadClicked) {
                console.log('⚠️ [Puppeteer] Could not find download button, trying alternative methods...');
            } else {
                console.log('✅ [Puppeteer] Download button clicked');
            }

            // Wait longer for download to complete (text files may take time)
            onProgress?.('Downloading file...');
            await new Promise(resolve => setTimeout(resolve, 15000)); // Increased wait time

            // Get the downloaded file name
            const fs = require('fs');
            const path = require('path');

            // List all files and find the most recent one
            const files = fs.readdirSync(downloadPath);
            console.log('📁 [Puppeteer] Files in download directory:', files);

            // Look for 26AS file with various patterns
            let downloadedFile = files.find((file: string) =>
                file.includes('26AS') ||
                file.includes('26as') ||
                file.includes('AnnualTaxStatement') ||
                file.includes('TaxCredit')
            );

            // If not found by name, get the most recent file
            if (!downloadedFile && files.length > 0) {
                const fileStats = files.map((file: string) => ({
                    name: file,
                    time: fs.statSync(path.join(downloadPath, file)).mtime.getTime()
                }));
                fileStats.sort((a: { name: string; time: number }, b: { name: string; time: number }) => b.time - a.time);
                downloadedFile = fileStats[0].name;
                console.log('📄 [Puppeteer] Using most recent file:', downloadedFile);
            }

            // Logout from TRACES portal if we're still on it
            const finalUrl = page.url();
            if (finalUrl.includes('tdscpc.gov.in')) {
                try {
                    onProgress?.('🚪 Logging out from TRACES...');
                    console.log('🚪 [Puppeteer] Logging out from TRACES portal');

                    await page.evaluate(() => {
                        const logoutLinks = Array.from(document.querySelectorAll('a'));
                        const logoutLink = logoutLinks.find(link =>
                            link.textContent?.toLowerCase().includes('logout')
                        );
                        if (logoutLink) {
                            logoutLink.click();
                        }
                    });

                    await new Promise(resolve => setTimeout(resolve, 2000));
                    console.log('✅ [Puppeteer] Logged out from TRACES');
                } catch (logoutError) {
                    console.log('⚠️ [Puppeteer] TRACES logout failed (non-critical):', logoutError);
                }
            }

            // Navigate back to Income Tax portal and logout
            try {
                onProgress?.('🚪 Logging out from Income Tax portal...');
                console.log('🚪 [Puppeteer] Logging out from Income Tax portal');

                await page.goto('https://eportal.incometax.gov.in/iec/foservices/#/dashboard', {
                    waitUntil: 'networkidle0',
                    timeout: 30000
                });

                await new Promise(resolve => setTimeout(resolve, 2000));

                // Click on profile/user icon and then logout
                await page.evaluate(() => {
                    // Look for logout button or link
                    const allElements = Array.from(document.querySelectorAll('a, button, *'));
                    const logoutElement = allElements.find(el => {
                        const text = el.textContent?.toLowerCase() || '';
                        return text.includes('log out') || text.includes('logout') || text === 'logout';
                    });
                    if (logoutElement && logoutElement instanceof HTMLElement) {
                        logoutElement.click();
                    }
                });

                await new Promise(resolve => setTimeout(resolve, 2000));
                console.log('✅ [Puppeteer] Logged out from Income Tax portal');
            } catch (logoutError) {
                console.log('⚠️ [Puppeteer] Income Tax portal logout failed (non-critical):', logoutError);
            }

            await browser.close();

            if (downloadedFile) {
                const filePath = path.join(downloadPath, downloadedFile);
                console.log('✅ [Puppeteer] 26AS downloaded successfully:', filePath);
                onProgress?.('✅ Download complete!');
                return { success: true, filePath };
            } else {
                throw new Error('Download completed but file not found');
            }

        } catch (error: any) {
            console.error('❌ [Puppeteer] 26AS Download failed:', error.message);
            await browser.close();
            onProgress?.('❌ ' + error.message);
            return { success: false, message: error.message };
        }
    }

    async downloadAIS(
        pan: string,
        password: string,
        downloadPath: string,
        event: Electron.IpcMainInvokeEvent,
        onProgress?: (status: string) => void
    ): Promise<{ success: boolean; filePath?: string; message?: string }> {
        console.log('📥 [Puppeteer] AIS Download started');

        const browser = await puppeteer.launch({
            headless: false, // Show browser for debugging and captcha entry
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--start-maximized'
            ],
            defaultViewport: null, // Use full window size
            devtools: false
        });

        try {
            const page = await browser.newPage();

            // Set download behavior
            const client = await page.createCDPSession();
            await client.send('Page.setDownloadBehavior', {
                behavior: 'allow',
                downloadPath: downloadPath
            });

            // Step 1: Login first in this browser session
            onProgress?.('Logging in to Income Tax portal...');

            // Navigate to login page
            await page.goto('https://eportal.incometax.gov.in/iec/foservices/#/login', {
                waitUntil: 'networkidle0',
                timeout: 60000
            });

            // Log current URL and wait longer for page to fully load
            const currentUrl = page.url();
            console.log('📍 [Puppeteer] Navigated to login page, URL:', currentUrl);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Increased wait time

            // Debug: List all input fields on the page
            const inputFields = await page.evaluate(() => {
                const inputs = Array.from(document.querySelectorAll('input'));
                return inputs.map(input => ({
                    id: input.id,
                    name: input.name,
                    type: input.type
                }));
            });
            console.log('📋 [Puppeteer] Input fields on page:', JSON.stringify(inputFields));

            // Enter PAN (using the correct selector found on the page)
            console.log('🔍 [Puppeteer] Looking for PAN input field...');
            await page.waitForSelector('#panAdhaarUserId', { timeout: 15000 });
            console.log('✅ [Puppeteer] Found PAN input field');
            await page.type('#panAdhaarUserId', pan);
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Click Continue
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const continueBtn = btns.find(b => b.textContent?.includes('Continue'));
                if (continueBtn) continueBtn.click();
            });
            await new Promise(resolve => setTimeout(resolve, 4000));

            // Check secure access checkbox
            await page.waitForSelector('#passwordCheckBox-input', { timeout: 10000 });
            await page.click('#passwordCheckBox-input');
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Enter password
            await page.waitForSelector('#loginPasswordField', { timeout: 10000 });
            await page.type('#loginPasswordField', password);
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Click Login button
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const loginBtn = btns.find(b => b.textContent?.includes('Continue'));
                if (loginBtn) loginBtn.click();
            });

            // Wait for navigation to dashboard
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Check for dual login
            const pageText = await page.evaluate(() => document.body.innerText);
            if (pageText.includes('Dual Login') || (pageText.includes('session') && pageText.includes('active'))) {
                console.log('⚠️ [Puppeteer] Dual login detected, handling...');
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
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            console.log('✅ [Puppeteer] Login successful, continuing with AIS download');

            // Step 2: Navigate to dashboard
            onProgress?.('Navigating to dashboard...');
            await page.goto('https://eportal.incometax.gov.in/iec/foservices/#/dashboard', {
                waitUntil: 'networkidle0',
                timeout: 60000
            });

            await new Promise(resolve => setTimeout(resolve, 3000));

            // Set up listener for new tab BEFORE clicking AIS
            onProgress?.('Setting up for AIS navigation...');
            const newTabPromise = new Promise<any>((resolve) => {
                browser.once('targetcreated', async (target) => {
                    const newPage = await target.page();
                    resolve(newPage);
                });
            });

            // Click on AIS link (it's a direct link, not a dropdown menu)
            onProgress?.('Clicking AIS link...');

            // First, let's see what links are available on the page
            const availableLinks = await page.evaluate(() => {
                const elements = Array.from(document.querySelectorAll('a, button'));
                return elements
                    .map(el => el.textContent?.trim())
                    .filter(text => text && text.length < 50) // Only short text
                    .slice(0, 20); // First 20 links
            });
            console.log('📋 [Puppeteer] Available links on page:', availableLinks);

            try {
                // Wait for AIS link to be available and click it
                await page.waitForFunction(
                    () => {
                        const elements = Array.from(document.querySelectorAll('a, button'));
                        return elements.some(el => el.textContent?.trim() === 'AIS');
                    },
                    { timeout: 20000 } // Increased timeout to 20 seconds
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

                console.log('✅ [Puppeteer] AIS link clicked');
            } catch (error) {
                console.error('❌ [Puppeteer] Error finding/clicking AIS link:', error);
                throw new Error('AIS link not found');
            }

            // Wait for new AIS tab to open
            onProgress?.('Waiting for AIS tab to open...');
            let aisPage;
            try {
                aisPage = await Promise.race([
                    newTabPromise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error('AIS tab timeout')), 15000))
                ]);
                console.log('✅ [Puppeteer] AIS tab opened');
            } catch (error) {
                // Check if we're already on AIS page
                const currentUrl = page.url();
                if (currentUrl.includes('insight.gov.in')) {
                    console.log('✅ [Puppeteer] Already on AIS page (same tab)');
                    aisPage = page;
                } else {
                    throw new Error('AIS tab did not open');
                }
            }

            // Switch to AIS tab
            await aisPage.bringToFront();

            // Set download behavior for AIS tab
            const aisClient = await aisPage.createCDPSession();
            await aisClient.send('Page.setDownloadBehavior', {
                behavior: 'allow',
                downloadPath: downloadPath
            });

            // Wait for AIS page to load
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Click "Download AIS/TIS" button
            onProgress?.('Clicking Download AIS/TIS button...');
            const downloadBtnClicked = await aisPage.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const downloadBtn = buttons.find(btn => {
                    const text = btn.textContent?.trim() || '';
                    return text.includes('Download AIS/TIS') || text.includes('Download');
                });
                if (downloadBtn) {
                    console.log('✅ Found Download AIS/TIS button, clicking...');
                    downloadBtn.click();
                    return true;
                }
                return false;
            });

            if (!downloadBtnClicked) {
                throw new Error('Download AIS/TIS button not found');
            }

            await new Promise(resolve => setTimeout(resolve, 3000));

            // Click the second Download button for JSON format
            onProgress?.('Selecting JSON download format...');
            const jsonDownloadClicked = await aisPage.evaluate(() => {
                // Look for the specific download button for JSON
                const buttons = Array.from(document.querySelectorAll('button'));
                // Find the button that corresponds to "Annual Information Statement (AIS) - JSON (for AIS Utility)"
                const jsonBtn = buttons.find(btn => {
                    const text = btn.textContent?.trim() || '';
                    // The button text is just "Download", but it's the second one in the modal
                    return text === 'Download';
                });

                // We need to find the correct Download button (second one for JSON)
                const downloadButtons = buttons.filter(btn => btn.textContent?.trim() === 'Download');
                if (downloadButtons.length >= 2) {
                    console.log('✅ Found JSON Download button (second Download), clicking...');
                    downloadButtons[1].click(); // Second download button is for JSON
                    return true;
                }
                return false;
            });

            if (!jsonDownloadClicked) {
                throw new Error('JSON Download button not found');
            }

            // Wait for captcha modal to appear
            onProgress?.('Waiting for captcha modal...');
            console.log('⏳ [Puppeteer] Waiting for captcha modal to appear...');

            // Wait up to 10 seconds for the captcha modal to appear
            let modalAppeared = false;
            for (let i = 0; i < 10; i++) {
                await new Promise(resolve => setTimeout(resolve, 1000));

                modalAppeared = await aisPage.evaluate(() => {
                    const modals = document.querySelectorAll('[role="dialog"], .modal, .dialog, [class*="modal"], [class*="dialog"]');
                    for (const modal of modals) {
                        // Check if this modal has a captcha image
                        const hasImage = modal.querySelector('img');
                        const hasInput = modal.querySelector('input[type="text"]');
                        if (hasImage && hasInput) {
                            return true;
                        }
                    }
                    return false;
                });

                if (modalAppeared) {
                    console.log(`✅ [Puppeteer] Captcha modal appeared after ${i + 1} seconds`);
                    break;
                }
            }

            if (!modalAppeared) {
                throw new Error('Captcha modal did not appear after 10 seconds');
            }

            // Extract captcha image and send to frontend
            onProgress?.('Extracting captcha image...');
            console.log('📸 [Puppeteer] Extracting captcha image...');

            // Wait a bit more for the captcha image to fully load
            await new Promise(resolve => setTimeout(resolve, 2000));

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

                // Try multiple strategies to find captcha image

                // Strategy 1: Look for images in modal/dialog containers (but skip SVGs and icons)
                const modals = document.querySelectorAll('[role="dialog"], .modal, .dialog, .popup, [class*="modal"], [class*="dialog"]');
                for (const modal of modals) {
                    const images = Array.from(modal.querySelectorAll('img'));
                    for (const img of images) {
                        // Skip SVG files and small icons
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
                    // Check parent container
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
                console.log('⚠️ [Puppeteer] Captcha image not found, falling back to manual entry');
                onProgress?.('⚠️ Please enter the captcha in the browser window...');
                await aisPage.waitForSelector('input[type="text"]', { timeout: 10000 });
            } else {
                console.log('✅ [Puppeteer] Captcha image extracted, sending to frontend');
                console.log('📸 [Puppeteer] Captcha image URL:', captchaImage.substring(0, 100) + '...');

                // Send captcha image to frontend and wait for response
                onProgress?.('Please enter the captcha in the dialog...');
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

                console.log('✅ [Puppeteer] Received captcha from user:', captchaText);

                // Enter captcha in the browser - look specifically in the modal
                console.log('🔍 [Puppeteer] Looking for captcha input field in modal...');

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
                    throw new Error('Could not find captcha input field');
                }

                console.log('✅ [Puppeteer] Captcha entered in input field');
                // Wait longer for the modal buttons to be enabled (some sites disable the button until captcha is validated)
                console.log('⏳ [Puppeteer] Waiting for Proceed button to be enabled...');
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Click the proceed/submit button with comprehensive debugging
                console.log('🔍 [Puppeteer] Looking for Proceed button...');

                // First, dump ALL elements on the page for debugging
                const pageDebugInfo = await aisPage.evaluate(() => {
                    const allButtons = Array.from(document.querySelectorAll('button'));
                    const allInputs = Array.from(document.querySelectorAll('input[type="button"], input[type="submit"]'));
                    const allDivs = Array.from(document.querySelectorAll('div[role="button"], div[onclick]'));
                    const allSpans = Array.from(document.querySelectorAll('span[role="button"], span[onclick]'));

                    const buttonInfo = allButtons.map(btn => ({
                        tag: 'BUTTON',
                        text: btn.textContent?.trim() || '',
                        disabled: btn.disabled,
                        visible: (btn as HTMLElement).offsetParent !== null,
                        classes: btn.className
                    }));

                    const inputInfo = allInputs.map(inp => ({
                        tag: 'INPUT',
                        text: (inp as HTMLInputElement).value || '',
                        disabled: (inp as HTMLInputElement).disabled,
                        visible: (inp as HTMLElement).offsetParent !== null,
                        classes: inp.className
                    }));

                    const divInfo = allDivs.map(div => ({
                        tag: 'DIV',
                        text: div.textContent?.trim() || '',
                        visible: (div as HTMLElement).offsetParent !== null,
                        classes: div.className
                    }));

                    const spanInfo = allSpans.map(span => ({
                        tag: 'SPAN',
                        text: span.textContent?.trim() || '',
                        visible: (span as HTMLElement).offsetParent !== null,
                        classes: span.className
                    }));

                    return {
                        buttons: buttonInfo,
                        inputs: inputInfo,
                        divs: divInfo,
                        spans: spanInfo,
                        totalClickables: buttonInfo.length + inputInfo.length + divInfo.length + spanInfo.length
                    };
                });

                console.log('🔍 [Puppeteer] Page debug info:', JSON.stringify(pageDebugInfo, null, 2));

                // Try to click the Proceed button using multiple strategies
                let buttonClicked = false;

                // Strategy 1: Search entire document, prioritizing actual buttons
                if (!buttonClicked) {
                    console.log('🔍 [Puppeteer] Strategy 1: Searching for button elements...');
                    try {
                        const buttonInfo = await aisPage.evaluate(() => {
                            // Priority 1: Search actual buttons and inputs first
                            const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));

                            console.log(`Found ${buttons.length} button/input elements`);

                            // First pass: Look for exact matches in buttons
                            for (const el of buttons) {
                                const text = (el.textContent || (el as HTMLInputElement).value || '').trim().toLowerCase();
                                const isVisible = (el as HTMLElement).offsetParent !== null;
                                const isDisabled = (el as HTMLButtonElement).disabled || el.getAttribute('disabled') !== null;

                                console.log(`Button: "${text}", visible: ${isVisible}, disabled: ${isDisabled}, tag: ${el.tagName}`);

                                if ((text === 'proceed' || text === 'submit' || text === 'ok') && isVisible && !isDisabled) {
                                    el.setAttribute('data-captcha-proceed', 'true');
                                    return {
                                        found: true,
                                        selector: '[data-captcha-proceed="true"]',
                                        text: text,
                                        tag: el.tagName
                                    };
                                }
                            }

                            // Second pass: Look for partial matches in buttons
                            for (const el of buttons) {
                                const text = (el.textContent || (el as HTMLInputElement).value || '').trim().toLowerCase();
                                const isVisible = (el as HTMLElement).offsetParent !== null;
                                const isDisabled = (el as HTMLButtonElement).disabled || el.getAttribute('disabled') !== null;

                                if ((text.includes('proceed') || text.includes('submit')) && isVisible && !isDisabled) {
                                    el.setAttribute('data-captcha-proceed', 'true');
                                    return {
                                        found: true,
                                        selector: '[data-captcha-proceed="true"]',
                                        text: text,
                                        tag: el.tagName
                                    };
                                }
                            }

                            // Priority 2: Only if no button found, search divs/spans with role="button"
                            const clickableDivs = Array.from(document.querySelectorAll('div[role="button"], span[role="button"], a'));
                            console.log(`Found ${clickableDivs.length} div/span/a elements with button role`);

                            for (const el of clickableDivs) {
                                const text = (el.textContent || '').trim().toLowerCase();
                                const isVisible = (el as HTMLElement).offsetParent !== null;

                                if ((text === 'proceed' || text === 'submit' || text === 'ok') && isVisible) {
                                    el.setAttribute('data-captcha-proceed', 'true');
                                    return {
                                        found: true,
                                        selector: '[data-captcha-proceed="true"]',
                                        text: text,
                                        tag: el.tagName
                                    };
                                }
                            }

                            return { found: false, reason: 'No visible proceed/submit button found' };
                        });

                        console.log(`🔍 [Puppeteer] Strategy 1 result:`, JSON.stringify(buttonInfo));

                        if (buttonInfo.found && buttonInfo.selector) {
                            console.log(`✅ Found button: "${buttonInfo.text}" (${buttonInfo.tag})`);
                            await aisPage.click(buttonInfo.selector);
                            buttonClicked = true;
                            console.log('✅ Proceed button clicked using Strategy 1');
                        }
                    } catch (e) {
                        console.log('⚠️ [Puppeteer] Strategy 1 failed:', e);
                    }
                }

                // Strategy 2: Use page.evaluate to click directly
                if (!buttonClicked) {
                    console.log('🔍 [Puppeteer] Strategy 2: Direct click via evaluate...');
                    buttonClicked = await aisPage.evaluate(() => {
                        const allElements = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], div, span, a'));

                        for (const el of allElements) {
                            const text = (el.textContent || (el as HTMLInputElement).value || '').trim().toLowerCase();
                            const isVisible = (el as HTMLElement).offsetParent !== null;

                            if ((text === 'proceed' || text === 'submit' || text === 'ok' ||
                                text.includes('proceed') || text.includes('submit')) && isVisible) {

                                console.log(`Clicking element: "${text}", tag: ${el.tagName}`);

                                if (el instanceof HTMLElement) {
                                    // Try multiple click methods
                                    el.click();
                                    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                                    return true;
                                }
                            }
                        }

                        console.log('❌ No clickable proceed button found');
                        return false;
                    });

                    if (buttonClicked) {
                        console.log('✅ Proceed button clicked using Strategy 2');
                    }
                }

                // Strategy 3: Wait for button and then click
                if (!buttonClicked) {
                    console.log('🔍 [Puppeteer] Strategy 3: Waiting for button to appear...');
                    try {
                        await aisPage.waitForFunction(
                            () => {
                                const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
                                return buttons.some(btn => {
                                    const text = (btn.textContent || (btn as HTMLInputElement).value || '').toLowerCase();
                                    const isVisible = (btn as HTMLElement).offsetParent !== null;
                                    return (text.includes('proceed') || text.includes('submit') || text === 'ok') && isVisible;
                                });
                            },
                            { timeout: 5000 }
                        );

                        buttonClicked = await aisPage.evaluate(() => {
                            const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
                            const proceedBtn = buttons.find(btn => {
                                const text = (btn.textContent || (btn as HTMLInputElement).value || '').toLowerCase();
                                const isVisible = (btn as HTMLElement).offsetParent !== null;
                                return (text.includes('proceed') || text.includes('submit') || text === 'ok') && isVisible;
                            });

                            if (proceedBtn && proceedBtn instanceof HTMLElement) {
                                console.log('Clicking proceed button after wait');
                                proceedBtn.click();
                                return true;
                            }
                            return false;
                        });

                        if (buttonClicked) {
                            console.log('✅ Proceed button clicked using Strategy 3');
                        }
                    } catch (e) {
                        console.log('⚠️ [Puppeteer] Strategy 3 failed:', e);
                    }
                }

                if (!buttonClicked) {
                    console.log('❌ [Puppeteer] All strategies failed - Proceed button not found or not clickable');
                    console.log('⚠️ [Puppeteer] Please manually click the Proceed button in the browser');
                } else {
                    console.log('✅ [Puppeteer] Proceed button clicked successfully');
                    // Wait for the download to start after clicking Proceed
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }

            // Wait for captcha entry and download to start
            onProgress?.('Waiting for download to start...');
            console.log('📂 [Puppeteer] Monitoring download directory:', downloadPath);

            // Wait for download to complete (monitor the download directory)
            const fs = require('fs');
            const path = require('path');

            let downloadedFile = null;
            const maxWaitTime = 120000; // 2 minutes max wait
            const startTime = Date.now();

            let checkCount = 0;

            while (Date.now() - startTime < maxWaitTime) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                checkCount++;

                // Check if file exists in download directory
                try {
                    const files = fs.readdirSync(downloadPath);

                    if (checkCount % 5 === 0) {
                        console.log(`🔍 [Puppeteer] Check #${checkCount}: Files in directory:`, files);
                    }

                    const jsonFile = files.find((file: string) =>
                        file.endsWith('.json') &&
                        (file.includes('AIS') || file.includes('ais'))
                    );

                    if (jsonFile) {
                        // Check if file is still being written (size is changing)
                        const filePath = path.join(downloadPath, jsonFile);
                        const stat1 = fs.statSync(filePath);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        const stat2 = fs.statSync(filePath);

                        if (stat1.size === stat2.size && stat2.size > 0) {
                            downloadedFile = jsonFile;
                            console.log('✅ [Puppeteer] AIS file downloaded:', downloadedFile);
                            break;
                        }
                    }
                } catch (e) {
                    // Directory might not exist yet or other error
                }
            }

            await browser.close();

            if (downloadedFile) {
                const filePath = path.join(downloadPath, downloadedFile);
                console.log('✅ [Puppeteer] AIS downloaded successfully:', filePath);
                onProgress?.('✅ Download complete!');
                return { success: true, filePath };
            } else {
                throw new Error('Download timeout - file not found after 2 minutes');
            }

        } catch (error: any) {
            console.error('❌ [Puppeteer] AIS Download failed:', error.message);
            await browser.close();
            onProgress?.('❌ ' + error.message);
            return { success: false, message: error.message };
        }
    }

    async logout(cookies: any[]): Promise<{ success: boolean; message?: string }> {
        console.log('🚪 [Puppeteer] Logout started');
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            const page = await browser.newPage();

            // Set cookies to maintain session
            for (const cookie of cookies) {
                try {
                    await page.setCookie(cookie);
                } catch (e) {
                    // Ignore cookie errors
                }
            }

            // Navigate to the portal dashboard
            await page.goto('https://eportal.incometax.gov.in/iec/foservices/#/dashboard', {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            }).catch(() => {
                console.log('⚠️ [Puppeteer] Navigation timeout, continuing anyway...');
            });

            console.log('� [Puppeteer] Page loaded, attempting logout...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Simple approach: Try to find and click logout directly without complex frame handling
            try {
                // Wait for any button to be available
                await page.waitForSelector('button, a', { timeout: 5000 }).catch(() => { });

                // Try to click logout using a simpler approach
                const loggedOut = await page.evaluate(() => {
                    try {
                        // Find all clickable elements
                        const allElements = document.querySelectorAll('*');

                        for (const el of Array.from(allElements)) {
                            const text = el.textContent?.trim() || '';
                            const innerText = (el as HTMLElement).innerText?.trim() || '';

                            // Look for "Log Out" text
                            if (text === 'Log Out' || innerText === 'Log Out' ||
                                text.toLowerCase() === 'logout' || innerText.toLowerCase() === 'logout') {

                                // Try to click it
                                if (el instanceof HTMLElement) {
                                    el.click();
                                    return true;
                                }
                            }
                        }
                        return false;
                    } catch (e) {
                        console.error('Error in logout evaluation:', e);
                        return false;
                    }
                });

                if (loggedOut) {
                    console.log('✅ [Puppeteer] Logout clicked');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            } catch (e) {
                console.log('⚠️ [Puppeteer] Logout click failed:', e);
            }

            await browser.close();
            console.log('✅ [Puppeteer] Logout completed (browser closed)');
            return { success: true };

        } catch (error: any) {
            console.error('❌ [Puppeteer] Logout failed:', error.message);
            try {
                await browser.close();
            } catch (e) {
                // Ignore close errors
            }
            return { success: false, message: error.message };
        }
    }
}

export default new PuppeteerService();
