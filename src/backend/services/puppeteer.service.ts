import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { browserService } from './browser.service';
// import { Browser, Page } from 'puppeteer';

puppeteer.use(StealthPlugin());

export class PuppeteerService {
    private abortController: AbortController | null = null;

    private getLaunchOptions() {
        const executablePath = browserService.getSelectedBrowser();
        const options: any = {
            headless: false, // TEMPORARILY DISABLED: Set to true to hide browser
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
        };
        if (executablePath) {
            options.executablePath = executablePath;
            console.log('🌐 [Puppeteer] Using browser:', executablePath);
        }
        return options;
    }

    async login(pan: string, password: string, onProgress?: (status: string) => void): Promise<{ success: boolean; cookies?: any[]; authToken?: string; message?: string }> {
        console.log('🤖 [Puppeteer] Login started for PAN:', pan);

        this.abortController = new AbortController();

        onProgress?.('Starting browser...');

        const browser = await puppeteer.launch(this.getLaunchOptions());

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

        const browser = await puppeteer.launch(this.getLaunchOptions());

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
        financialYear: string,
        downloadPath: string,
        event: Electron.IpcMainInvokeEvent,
        onProgress?: (status: string) => void
    ): Promise<{ success: boolean; filePath?: string; message?: string }> {
        console.log('📥 [Puppeteer] AIS Download started for F.Y.:', financialYear);

        const launchOpts = this.getLaunchOptions();
        const browser = await puppeteer.launch({
            ...launchOpts,
            headless: false, // Show browser for debugging and captcha entry
            args: [
                ...(launchOpts.args || []),
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

            await new Promise(resolve => setTimeout(resolve, 3000));

            // Now click the "AIS" tab on this page (next to "Instructions" tab)
            onProgress?.('Clicking AIS tab on AIS page...');
            console.log('🔍 [Puppeteer] Looking for AIS tab (next to Instructions)...');

            const aisTabClicked = await aisPage.evaluate(() => {
                // Look for the AIS tab - it's next to "Instructions" tab
                const allElements = Array.from(document.querySelectorAll('a, button, div, span'));

                // Find elements with exactly "AIS" text (not "AIS Instructions")
                const aisElements = allElements.filter(el => {
                    const text = el.textContent?.trim();
                    return text === 'AIS';
                });

                console.log(`Found ${aisElements.length} elements with "AIS" text`);

                // Look for one that's a tab (likely has role="tab" or is near "Instructions")
                for (const el of aisElements) {
                    const role = el.getAttribute('role');
                    const parent = el.parentElement;

                    // Check if it's a tab or near the Instructions tab
                    if (role === 'tab' || parent?.textContent?.includes('Instructions')) {
                        console.log('Found AIS tab, clicking...');
                        if (el instanceof HTMLElement) {
                            el.click();
                            return true;
                        }
                    }
                }

                // Fallback: click the first AIS element
                if (aisElements.length > 0 && aisElements[0] instanceof HTMLElement) {
                    console.log('Fallback: clicking first AIS element...');
                    aisElements[0].click();
                    return true;
                }

                return false;
            });

            if (!aisTabClicked) {
                console.log('⚠️ [Puppeteer] Could not find AIS tab, continuing anyway...');
            } else {
                console.log('✅ [Puppeteer] AIS tab clicked');
            }

            // Step 3: Click on the AIS card (the entire card is clickable)
            onProgress?.('Clicking on AIS card...');
            console.log('🔍 [Puppeteer] Looking for AIS card to click...');

            // Wait a bit for cards to fully render
            await new Promise(resolve => setTimeout(resolve, 2000));

            const aisCardClicked = await aisPage.evaluate(() => {
                const debugInfo: string[] = [];
                debugInfo.push('Starting AIS card search...');

                // Find the AIS card - look for card elements containing AIS text
                const allCards = Array.from(document.querySelectorAll('[class*="card"]'));
                debugInfo.push(`Total card elements: ${allCards.length}`);

                // Log all card texts for debugging
                allCards.forEach((card, idx) => {
                    const text = card.textContent?.trim() || '';
                    debugInfo.push(`Card ${idx}: "${text.substring(0, 80)}..."`);
                });

                let aisCardCandidates: Array<{ el: Element, text: string, length: number }> = [];

                for (const card of allCards) {
                    const text = card.textContent?.trim() || '';
                    const normalizedText = text.replace(/\s+/g, ' ');

                    // Look for AIS card - more flexible matching
                    // Must contain "Annual Information Statement" OR "AIS"
                    // Must NOT contain "Taxpayer Information Summary" or just "TIS" alone
                    const hasAISText = normalizedText.includes('Annual Information Statement') ||
                        (normalizedText.includes('AIS') && normalizedText.includes('Annual'));
                    const notTIS = !normalizedText.includes('Taxpayer Information Summary') &&
                        !(normalizedText.includes('TIS') && !normalizedText.includes('AIS'));

                    if (hasAISText && notTIS) {
                        aisCardCandidates.push({ el: card, text: normalizedText, length: text.length });
                        debugInfo.push(`Found AIS candidate: length=${text.length}, text="${normalizedText.substring(0, 50)}..."`);
                    }
                }

                debugInfo.push(`Found ${aisCardCandidates.length} AIS card candidates`);

                // Sort by text length (smallest first) to get the most specific card
                aisCardCandidates.sort((a, b) => a.length - b.length);

                // Click the smallest (most specific) AIS card
                if (aisCardCandidates.length > 0) {
                    const aisCard = aisCardCandidates[0];
                    debugInfo.push(`Clicking AIS card with text length: ${aisCard.length}`);

                    if (aisCard.el instanceof HTMLElement) {
                        aisCard.el.click();
                        return { success: true, method: 'card-click', tag: aisCard.el.tagName, textLength: aisCard.length, debug: debugInfo };
                    }
                }

                debugInfo.push('AIS card not found!');
                return { success: false, error: 'AIS card not found', debug: debugInfo };
            });

            console.log('📋 [Puppeteer] AIS card click result:', JSON.stringify(aisCardClicked, null, 2));

            if (!aisCardClicked.success) {
                throw new Error(`AIS card not found: ${aisCardClicked.error || 'unknown error'}`);
            }

            console.log(`✅ [Puppeteer] AIS card clicked (method: ${aisCardClicked.method})`);

            // Wait for navigation to AIS page
            onProgress?.('Waiting for AIS page to load...');
            console.log('⏳ [Puppeteer] Waiting for AIS page to load...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Step 4: Select Financial Year from dropdown (reuse TIS logic)
            onProgress?.(`Selecting financial year ${financialYear}...`);
            console.log(`🔍 [Puppeteer] Selecting F.Y. ${financialYear} from dropdown...`);

            try {
                // Wait a bit for the page to fully load
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Find and click the F.Y. dropdown
                const dropdownInfo = await aisPage.evaluate(() => {
                    const debugInfo: string[] = [];

                    // Look for app-dropdown-btn specifically
                    const appDropdown = document.querySelector('app-dropdown-btn');
                    if (appDropdown) {
                        debugInfo.push('Found app-dropdown-btn element');
                        const button = appDropdown.querySelector('button');
                        if (button) {
                            const text = button.textContent?.trim() || '';
                            debugInfo.push(`Button text: "${text}"`);
                            if (button instanceof HTMLElement) {
                                button.click();
                                return { success: true, method: 'app-dropdown-btn', text, debug: debugInfo };
                            }
                        }
                    }

                    // Fallback: look for any element with F.Y. text
                    const allElements = Array.from(document.querySelectorAll('button, select, [role="combobox"]'));
                    for (const el of allElements) {
                        const text = el.textContent?.trim() || '';
                        if (text.includes('F.Y.') && text.match(/20\d{2}-\d{2}/)) {
                            debugInfo.push(`Found F.Y. element: "${text}"`);
                            if (el instanceof HTMLElement) {
                                el.click();
                                return { success: true, method: 'fy-text-match', text, debug: debugInfo };
                            }
                        }
                    }

                    debugInfo.push('No F.Y. dropdown found');
                    return { success: false, debug: debugInfo };
                });

                console.log('📋 [Puppeteer] Dropdown search result:', JSON.stringify(dropdownInfo, null, 2));

                if (dropdownInfo.success) {
                    console.log(`✅ [Puppeteer] Clicked F.Y. dropdown (${dropdownInfo.method})`);

                    // Wait for dropdown options to appear
                    await new Promise(resolve => setTimeout(resolve, 3000));

                    // Select the specific year
                    const optionResult = await aisPage.evaluate((fy: string) => {
                        const debugInfo: string[] = [];

                        // Look for dropdown options with the specific year
                        const options = Array.from(document.querySelectorAll('button.dropdown-item, mat-option, [role="option"], li, option'));
                        debugInfo.push(`Found ${options.length} dropdown options`);

                        for (const option of options) {
                            const text = option.textContent?.trim() || '';
                            debugInfo.push(`Option: "${text}"`);

                            if (text.includes(fy)) {
                                debugInfo.push(`Clicking option with F.Y. ${fy}`);
                                if (option instanceof HTMLElement) {
                                    option.click();
                                    return { success: true, text, debug: debugInfo };
                                }
                            }
                        }

                        debugInfo.push(`F.Y. ${fy} option not found`);
                        return { success: false, debug: debugInfo };
                    }, financialYear);

                    console.log('📋 [Puppeteer] Option selection result:', JSON.stringify(optionResult, null, 2));

                    if (optionResult.success) {
                        console.log(`✅ [Puppeteer] Selected F.Y. ${financialYear}`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    } else {
                        console.log(`⚠️ [Puppeteer] Could not select F.Y. ${financialYear}, continuing anyway...`);
                    }
                } else {
                    console.log('⚠️ [Puppeteer] F.Y. dropdown not found, continuing anyway...');
                }
            } catch (error) {
                console.log('⚠️ [Puppeteer] Error selecting F.Y., continuing anyway:', error);
            }

            // Step 5: Click Download button
            onProgress?.('Clicking Download button...');
            console.log('🔍 [Puppeteer] Looking for Download button...');

            const downloadBtnClicked = await aisPage.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const downloadBtn = buttons.find(btn => {
                    const text = btn.textContent?.trim() || '';
                    return text === 'Download' || text.includes('Download');
                });
                if (downloadBtn && downloadBtn instanceof HTMLElement) {
                    console.log('✅ Found Download button, clicking...');
                    downloadBtn.click();
                    return true;
                }
                return false;
            });

            if (!downloadBtnClicked) {
                throw new Error('Download button not found');
            }

            console.log('✅ [Puppeteer] Download button clicked');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Step 6: Handle download modal - click JSON Download button in modal
            onProgress?.('Handling download modal - selecting JSON format...');
            console.log('🔍 [Puppeteer] Looking for JSON Download button in modal...');

            const modalDownloadClicked = await aisPage.evaluate(() => {
                // Look for Download button in modal specifically for JSON
                const modals = document.querySelectorAll('[role="dialog"], .modal, .dialog, [class*="modal"]');
                for (const modal of modals) {
                    // Look for all Download buttons
                    const buttons = Array.from(modal.querySelectorAll('button'));
                    const downloadButtons = buttons.filter(btn => btn.textContent?.trim() === 'Download');

                    console.log(`Found ${downloadButtons.length} Download buttons in modal`);

                    // Find the JSON download button - it should be the 2nd one or near "JSON" text
                    for (let i = 0; i < downloadButtons.length; i++) {
                        const btn = downloadButtons[i];
                        // Check if this button is near "JSON" or "AIS Utility" text
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

                    // Fallback: click the 2nd Download button (index 1)
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

            console.log('✅ [Puppeteer] Modal JSON Download button clicked');

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

    async downloadTIS(
        pan: string,
        password: string,
        financialYear: string,
        downloadPath: string,
        event: Electron.IpcMainInvokeEvent,
        onProgress?: (status: string) => void
    ): Promise<{ success: boolean; filePath?: string; message?: string }> {
        console.log('📥 [Puppeteer] TIS Download started for F.Y.:', financialYear);

        const launchOpts = this.getLaunchOptions();
        const browser = await puppeteer.launch({
            ...launchOpts,
            headless: false,
            args: [
                ...(launchOpts.args || []),
                '--start-maximized'
            ],
            defaultViewport: null,
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

            // Step 1: Login (reuse login logic from downloadAIS)
            onProgress?.('Logging in to Income Tax portal...');
            await page.goto('https://eportal.incometax.gov.in/iec/foservices/#/login', {
                waitUntil: 'networkidle0',
                timeout: 60000
            });

            const currentUrl = page.url();
            console.log('📍 [Puppeteer] Navigated to login page, URL:', currentUrl);
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Enter PAN
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

            console.log('✅ [Puppeteer] Login successful, continuing with TIS download');

            // Step 2: Navigate to dashboard
            onProgress?.('Navigating to dashboard...');
            await page.goto('https://eportal.incometax.gov.in/iec/foservices/#/dashboard', {
                waitUntil: 'networkidle0',
                timeout: 60000
            });

            await new Promise(resolve => setTimeout(resolve, 3000));

            // Set up listener for new AIS tab BEFORE clicking the link
            onProgress?.('Setting up for AIS navigation...');
            const newTabPromise = new Promise<any>((resolve) => {
                browser.once('targetcreated', async (target) => {
                    const newPage = await target.page();
                    resolve(newPage);
                });
            });

            // Click on AIS link
            onProgress?.('Clicking AIS link...');
            console.log('🔍 [Puppeteer] Looking for AIS link...');

            try {
                await page.waitForFunction(
                    () => {
                        const elements = Array.from(document.querySelectorAll('a, button, div, span'));
                        const aisElements = elements.filter(el => el.textContent?.trim() === 'AIS');
                        // Need at least 2 AIS elements (nav + tab)
                        return aisElements.length >= 2;
                    },
                    { timeout: 20000 }
                );

                // Click AIS link - look for the actual link element, not nested children
                const clickResult = await page.evaluate(() => {
                    const elements = Array.from(document.querySelectorAll('a, button, div, span'));
                    const aisElements = elements.filter(el => el.textContent?.trim() === 'AIS');

                    // Return element details for logging
                    const elementDetails = aisElements.map((el, index) => ({
                        index: index + 1,
                        tag: el.tagName,
                        classes: el.className,
                        role: el.getAttribute('role'),
                        parent: el.parentElement?.tagName,
                        id: el.id
                    }));

                    // Find the actual AIS link - prioritize element with id="AIS" or first <A> tag
                    let aisLink = aisElements.find(el => el.id === 'AIS');

                    if (!aisLink) {
                        // Fallback: find first <A> tag with AIS text
                        aisLink = aisElements.find(el => el.tagName === 'A');
                    }

                    if (!aisLink) {
                        // Last resort: use first element
                        aisLink = aisElements[0];
                    }

                    if (aisLink && aisLink instanceof HTMLElement) {
                        const clickedIndex = aisElements.indexOf(aisLink) + 1;
                        aisLink.click();
                        return {
                            success: true,
                            clickedIndex,
                            clickedElement: {
                                tag: aisLink.tagName,
                                id: aisLink.id,
                                classes: aisLink.className
                            },
                            totalElements: aisElements.length,
                            elementDetails
                        };
                    }
                    return { success: false, totalElements: aisElements.length, elementDetails };
                });

                console.log('🔍 [Puppeteer] Click result:', JSON.stringify(clickResult, null, 2));

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
                // If new tab didn't open, check if we're already on AIS page
                const currentUrl = page.url();
                if (currentUrl.includes('insight.gov.in')) {
                    console.log('✅ [Puppeteer] Already on AIS page (same tab)');
                    aisPage = page;
                } else {
                    throw new Error('AIS tab did not open');
                }
            }

            await aisPage.bringToFront();

            // Wait for AIS content to actually load - look for specific AIS page indicators
            onProgress?.('Waiting for AIS content to load...');
            console.log('⏳ [Puppeteer] Waiting for AIS content to load...');

            try {
                // Wait for either URL change or AIS-specific content to appear
                await Promise.race([
                    // Option 1: Wait for URL to contain 'ais' or 'insight'
                    aisPage.waitForFunction(
                        () => window.location.href.includes('ais') || window.location.href.includes('insight'),
                        { timeout: 15000 }
                    ),
                    // Option 2: Wait for AIS page content to appear
                    aisPage.waitForFunction(
                        () => {
                            const text = document.body.innerText;
                            return text.includes('Annual Information Statement') ||
                                text.includes('Taxpayer Information Summary') ||
                                text.includes('F.Y. 202');
                        },
                        { timeout: 15000 }
                    )
                ]);
                console.log('✅ [Puppeteer] AIS content detected');
            } catch (error) {
                console.log('⚠️ [Puppeteer] AIS content wait timeout, checking page state...');
            }

            // Additional wait for page to stabilize
            await new Promise(resolve => setTimeout(resolve, 3000));

            console.log('✅ [Puppeteer] On AIS tab content');

            // Debug: Check what's on the page
            const pageDebug = await aisPage.evaluate(() => {
                const bodyText = document.body.innerText.substring(0, 500);
                const hasDropdown = document.querySelectorAll('select').length;
                const hasTIS = document.body.innerText.includes('TIS') || document.body.innerText.includes('Taxpayer Information Summary');
                return { bodyText, hasDropdown, hasTIS };
            });
            console.log('📋 [Puppeteer] Page debug:', pageDebug);

            // Set download behavior for the AIS page
            const aisClient = await aisPage.createCDPSession();
            await aisClient.send('Page.setDownloadBehavior', {
                behavior: 'allow',
                downloadPath: downloadPath
            });

            await new Promise(resolve => setTimeout(resolve, 3000));

            // Now click the "AIS" tab on this page (next to "Instructions" tab)
            onProgress?.('Clicking AIS tab on AIS page...');
            console.log('🔍 [Puppeteer] Looking for AIS tab (next to Instructions)...');

            const aisTabClicked = await aisPage.evaluate(() => {
                // Look for the AIS tab - it's next to "Instructions" tab
                const allElements = Array.from(document.querySelectorAll('a, button, div, span'));

                // Find elements with exactly "AIS" text (not "AIS Instructions")
                const aisElements = allElements.filter(el => {
                    const text = el.textContent?.trim();
                    return text === 'AIS';
                });

                console.log(`Found ${aisElements.length} elements with "AIS" text`);

                // Look for one that's a tab (likely has role="tab" or is near "Instructions")
                for (const el of aisElements) {
                    const role = el.getAttribute('role');
                    const parent = el.parentElement;

                    // Check if it's a tab or near the Instructions tab
                    if (role === 'tab' || parent?.textContent?.includes('Instructions')) {
                        console.log('Found AIS tab, clicking...');
                        if (el instanceof HTMLElement) {
                            el.click();
                            return true;
                        }
                    }
                }

                // Fallback: click the first AIS element
                if (aisElements.length > 0 && aisElements[0] instanceof HTMLElement) {
                    console.log('Fallback: clicking first AIS element...');
                    aisElements[0].click();
                    return true;
                }

                return false;
            });

            if (!aisTabClicked) {
                console.log('⚠️ [Puppeteer] Could not find AIS tab, continuing anyway...');
            } else {
                console.log('✅ [Puppeteer] AIS tab clicked');
            }

            // Step 3: Click on the TIS card (the entire card is clickable)
            onProgress?.('Clicking on TIS card...');
            console.log('🔍 [Puppeteer] Looking for TIS card to click...');

            // Wait a bit for cards to fully render
            await new Promise(resolve => setTimeout(resolve, 2000));

            const tisCardClicked = await aisPage.evaluate(() => {
                const debugInfo: string[] = [];
                debugInfo.push('Starting TIS card search...');

                // Find the TIS card - look for card elements containing TIS text
                const allCards = Array.from(document.querySelectorAll('[class*="card"]'));
                debugInfo.push(`Total card elements: ${allCards.length}`);

                // Log all card texts for debugging
                allCards.forEach((card, idx) => {
                    const text = card.textContent?.trim() || '';
                    debugInfo.push(`Card ${idx}: "${text.substring(0, 80)}..."`);
                });

                let tisCardCandidates: Array<{ el: Element, text: string, length: number }> = [];

                for (const card of allCards) {
                    const text = card.textContent?.trim() || '';
                    const normalizedText = text.replace(/\s+/g, ' ');

                    // Look for TIS card - more flexible matching
                    // Must contain "Taxpayer Information Summary" OR "TIS"
                    // Must NOT contain "Annual Information Statement" or just "AIS" alone
                    const hasTISText = normalizedText.includes('Taxpayer Information Summary') ||
                        (normalizedText.includes('TIS') && normalizedText.includes('Taxpayer'));
                    const notAIS = !normalizedText.includes('Annual Information Statement') &&
                        !(normalizedText.includes('AIS') && !normalizedText.includes('TIS'));

                    if (hasTISText && notAIS) {
                        tisCardCandidates.push({ el: card, text: normalizedText, length: text.length });
                        debugInfo.push(`Found TIS candidate: length=${text.length}, text="${normalizedText.substring(0, 50)}..."`);
                    }
                }

                debugInfo.push(`Found ${tisCardCandidates.length} TIS card candidates`);

                // Sort by text length (smallest first) to get the most specific card
                tisCardCandidates.sort((a, b) => a.length - b.length);

                // Click the smallest (most specific) TIS card
                if (tisCardCandidates.length > 0) {
                    const tisCard = tisCardCandidates[0];
                    debugInfo.push(`Clicking TIS card with text length: ${tisCard.length}`);

                    if (tisCard.el instanceof HTMLElement) {
                        tisCard.el.click();
                        return { success: true, method: 'card-click', tag: tisCard.el.tagName, textLength: tisCard.length, debug: debugInfo };
                    }
                }

                debugInfo.push('TIS card not found!');
                return { success: false, error: 'TIS card not found', debug: debugInfo };
            });

            console.log('📋 [Puppeteer] TIS card click result:', JSON.stringify(tisCardClicked, null, 2));

            if (!tisCardClicked.success) {
                throw new Error(`TIS card not found: ${tisCardClicked.error || 'unknown error'}`);
            }

            console.log(`✅ [Puppeteer] TIS card clicked (method: ${tisCardClicked.method})`);

            // Wait for navigation to TIS page
            onProgress?.('Waiting for TIS page to load...');
            console.log('⏳ [Puppeteer] Waiting for TIS page to load...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Check if we actually navigated
            const tisPageUrl = aisPage.url();
            console.log(`📍 [Puppeteer] Current URL after TIS click: ${tisPageUrl}`);

            // Debug: Log all links on the page to find the correct TIS link
            const linkDebug = await aisPage.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a'));
                return links.map(link => ({
                    text: link.textContent?.trim().substring(0, 50) || '',
                    href: link.getAttribute('href') || '',
                    classes: link.getAttribute('class') || ''
                })).filter(link =>
                    link.text.includes('TIS') || link.text.includes('Taxpayer')
                );
            });
            console.log('📋 [Puppeteer] TIS-related links on page:', JSON.stringify(linkDebug, null, 2));

            // Step 4: Select Financial Year from dropdown
            onProgress?.(`Selecting financial year ${financialYear}...`);
            console.log(`🔍 [Puppeteer] Selecting F.Y. ${financialYear} from dropdown...`);

            try {
                // Wait a bit for the page to fully load
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Find and click the F.Y. dropdown with detailed logging
                const dropdownInfo = await aisPage.evaluate(() => {
                    const debugInfo: string[] = [];

                    // Look for app-dropdown-btn specifically
                    const appDropdown = document.querySelector('app-dropdown-btn');
                    if (appDropdown) {
                        debugInfo.push('Found app-dropdown-btn element');
                        const button = appDropdown.querySelector('button');
                        if (button) {
                            const text = button.textContent?.trim() || '';
                            debugInfo.push(`Button text: "${text}"`);
                            if (button instanceof HTMLElement) {
                                button.click();
                                return { success: true, method: 'app-dropdown-btn', text, debug: debugInfo };
                            }
                        }
                    }

                    // Fallback: look for any element with F.Y. text
                    const allElements = Array.from(document.querySelectorAll('button, select, [role="combobox"]'));
                    for (const el of allElements) {
                        const text = el.textContent?.trim() || '';
                        if (text.includes('F.Y.') && text.match(/20\d{2}-\d{2}/)) {
                            debugInfo.push(`Found F.Y. element: "${text}"`);
                            if (el instanceof HTMLElement) {
                                el.click();
                                return { success: true, method: 'fy-text-match', text, debug: debugInfo };
                            }
                        }
                    }

                    debugInfo.push('No F.Y. dropdown found');
                    return { success: false, debug: debugInfo };
                });

                console.log('📋 [Puppeteer] Dropdown search result:', JSON.stringify(dropdownInfo, null, 2));

                if (dropdownInfo.success) {
                    console.log(`✅ [Puppeteer] Clicked F.Y. dropdown (${dropdownInfo.method})`);

                    // Wait longer for dropdown overlay and options to appear and render
                    await new Promise(resolve => setTimeout(resolve, 5000));

                    // Select the specific year - try twice if needed
                    let optionResult: any = null;

                    for (let attempt = 1; attempt <= 2; attempt++) {
                        console.log(`🔍 [Puppeteer] Attempt ${attempt} to find F.Y. options...`);

                        optionResult = await aisPage.evaluate((fy: string, attemptNum: number) => {
                            const debugInfo: string[] = [];

                            // Look for dropdown overlay
                            const overlays = document.querySelectorAll('[class*="mat-select-panel"], [class*="cdk-overlay"], [class*="dropdown"], [role="listbox"]');
                            debugInfo.push(`Found ${overlays.length} potential overlay elements`);

                            let allOptions: Element[] = [];

                            for (const overlay of overlays) {
                                const isVisible = (overlay as HTMLElement).offsetParent !== null;
                                if (isVisible) {
                                    // Try standard option selectors AND button.dropdown-item (Bootstrap dropdowns)
                                    const options = Array.from(overlay.querySelectorAll('mat-option, [role="option"], li, option, button.dropdown-item'));
                                    allOptions = allOptions.concat(options);
                                    debugInfo.push(`Found ${options.length} options in visible overlay`);

                                    // If no options found, inspect the HTML structure
                                    if (options.length === 0 && attemptNum === 1) {
                                        const overlayHTML = (overlay as HTMLElement).innerHTML;
                                        debugInfo.push(`Overlay HTML (first 500 chars): ${overlayHTML.substring(0, 500)}`);

                                        // Try to find any clickable elements
                                        const clickableElements = Array.from(overlay.querySelectorAll('div, span, a, button'));
                                        debugInfo.push(`Found ${clickableElements.length} clickable elements in overlay`);

                                        // Log first few elements
                                        clickableElements.slice(0, 5).forEach((el, idx) => {
                                            const text = el.textContent?.trim() || '';
                                            const classes = el.getAttribute('class') || '';
                                            debugInfo.push(`  Element ${idx}: tag=${el.tagName}, text="${text.substring(0, 30)}", classes="${classes.substring(0, 50)}"`);
                                        });
                                    }
                                }
                            }

                            // Fallback: search entire document
                            if (allOptions.length === 0) {
                                allOptions = Array.from(document.querySelectorAll('mat-option, [role="option"]'));
                                debugInfo.push(`Fallback: found ${allOptions.length} options in document`);
                            }

                            const optionTexts = allOptions.map(o => o.textContent?.trim()).slice(0, 10);
                            debugInfo.push(`Option texts: ${JSON.stringify(optionTexts)}`);

                            for (const option of allOptions) {
                                const text = option.textContent?.trim() || '';
                                if (text.includes(fy) || text === `F.Y. ${fy}` || text === fy) {
                                    debugInfo.push(`Clicking option: "${text}"`);
                                    if (option instanceof HTMLElement) {
                                        option.click();
                                        return { success: true, matched: text, debug: debugInfo };
                                    }
                                }
                            }

                            return { success: false, totalOptions: allOptions.length, optionTexts, debug: debugInfo };
                        }, financialYear, attempt);

                        console.log('📋 [Puppeteer] Option selection result:', JSON.stringify(optionResult, null, 2));

                        if (optionResult.success) {
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            console.log(`✅ [Puppeteer] Selected F.Y. ${financialYear}`);
                            break; // Exit retry loop on success
                        } else if (attempt < 2) {
                            console.log(`⚠️ [Puppeteer] Attempt ${attempt} failed, waiting before retry...`);
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        } else {
                            console.log(`⚠️ [Puppeteer] Could not find option for ${financialYear} after ${attempt} attempts`);
                        }
                    }
                } else {
                    console.log('⚠️ [Puppeteer] Could not find F.Y. dropdown');
                }
            } catch (error) {
                console.log('⚠️ [Puppeteer] Error selecting F.Y.:', error);
            }

            // Note: TIS page loads with the current financial year by default
            // F.Y. dropdown selection is not reliable, so we skip it and use whatever year is loaded
            console.log('ℹ️ [Puppeteer] Using default financial year shown on TIS page');

            // Step 5: Find and click Download button on TIS page

            // Wait for navigation to TIS page
            onProgress?.('Waiting for TIS page to load...');
            console.log('⏳ [Puppeteer] Waiting for TIS page to load...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Step 5: Find and click Download button on TIS page
            onProgress?.('Looking for Download button on TIS page...');
            console.log('📥 [Puppeteer] Looking for Download button on TIS page...');

            // Set up download handling BEFORE clicking download button
            console.log(`📁 [Puppeteer] Setting up download to: ${downloadPath}`);
            const cdpClient = await aisPage.target().createCDPSession();
            await cdpClient.send('Page.setDownloadBehavior', {
                behavior: 'allow',
                downloadPath: downloadPath
            });
            console.log('✅ [Puppeteer] CDP download behavior configured');

            const downloadButtonClicked = await aisPage.evaluate(() => {
                // Look for Download button - it's usually a button with "Download" text or download icon
                const allButtons = Array.from(document.querySelectorAll('button, a, [role="button"]'));

                for (const btn of allButtons) {
                    const btnText = btn.textContent?.trim() || '';
                    const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
                    const title = btn.getAttribute('title')?.toLowerCase() || '';
                    const classes = btn.getAttribute('class') || '';

                    // Check if this is a Download button
                    const hasDownloadText = btnText.toLowerCase().includes('download');
                    const hasDownloadAttr = ariaLabel.includes('download') || title.includes('download');
                    const isPrimaryButton = classes.includes('primary') || classes.includes('mat-raised-button');

                    if ((hasDownloadText || hasDownloadAttr) && btn instanceof HTMLElement) {
                        console.log(`Found Download button: text="${btnText}", classes="${classes}"`);
                        btn.click();
                        return { success: true, text: btnText, classes };
                    }
                }

                return { success: false, error: 'Download button not found' };
            });

            console.log('📋 [Puppeteer] Download button click result:', JSON.stringify(downloadButtonClicked, null, 2));

            if (!downloadButtonClicked.success) {
                throw new Error('Download button not found on TIS page');
            }

            console.log(`✅ [Puppeteer] Download button clicked: ${downloadButtonClicked.text}`);

            // Wait for download modal to appear
            onProgress?.('Waiting for download modal...');
            console.log('⏳ [Puppeteer] Waiting for download modal to appear...');
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Click the Download button inside the modal
            const modalDownloadClicked = await aisPage.evaluate(() => {
                // Look for modal/dialog elements
                const modals = document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="dialog"]');

                for (const modal of modals) {
                    // Check if this modal is visible
                    const isVisible = (modal as HTMLElement).offsetParent !== null;
                    if (!isVisible) continue;

                    // Look for Download button inside the modal
                    const buttons = modal.querySelectorAll('button');
                    for (const btn of buttons) {
                        const text = btn.textContent?.trim() || '';
                        if (text.toLowerCase().includes('download') && btn instanceof HTMLElement) {
                            btn.click();
                            return { success: true, text, location: 'modal' };
                        }
                    }
                }

                return { success: false, error: 'Modal download button not found' };
            });

            console.log('📋 [Puppeteer] Modal download button click result:', JSON.stringify(modalDownloadClicked, null, 2));

            if (!modalDownloadClicked.success) {
                console.log('⚠️ [Puppeteer] Modal download button not found, proceeding anyway...');
            } else {
                console.log(`✅ [Puppeteer] Modal download button clicked: ${modalDownloadClicked.text}`);
            }

            // Set up download handling
            onProgress?.('Waiting for download to start...');
            console.log('⏳ [Puppeteer] Waiting for download to start...');
            console.log(`📂 [Puppeteer] Monitoring download directory: ${downloadPath}`);

            // Wait for download to complete by monitoring the download directory
            const fs = require('fs');
            const path = require('path');

            // Track existing files
            let existingFiles: string[] = [];
            try {
                existingFiles = fs.readdirSync(downloadPath);
            } catch (e) {
                // Directory might not exist yet
            }

            let downloadedFile = null;
            const maxWaitTime = 30000; // 30 seconds
            const startTime = Date.now();

            while (Date.now() - startTime < maxWaitTime) {
                await new Promise(resolve => setTimeout(resolve, 1000));

                try {
                    const files = fs.readdirSync(downloadPath);
                    const newPdfFiles = files.filter((file: string) =>
                        file.endsWith('.pdf') && !existingFiles.includes(file)
                    );

                    // Also check for recently modified existing files (in case browser overwrites)
                    const recentlyModifiedFiles = files.filter((file: string) => {
                        if (!file.endsWith('.pdf')) return false;
                        const filePath = path.join(downloadPath, file);
                        const stat = fs.statSync(filePath);
                        const fileAge = Date.now() - stat.mtimeMs;
                        return fileAge < 5000; // Modified in last 5 seconds
                    });

                    // Log what we're seeing every 5 seconds
                    if ((Date.now() - startTime) % 5000 < 1000) {
                        console.log(`📂 [Puppeteer] Checking download directory (${Math.round((Date.now() - startTime) / 1000)}s elapsed):`);
                        console.log(`   Total files: ${files.length}, New PDFs: ${newPdfFiles.length}, Recently modified: ${recentlyModifiedFiles.length}`);
                        if (files.length > 0) {
                            console.log(`   Files: ${files.join(', ')}`);
                        }
                    }

                    // Check new files first
                    if (newPdfFiles.length > 0) {
                        const pdfFile = newPdfFiles[0];
                        const filePath = path.join(downloadPath, pdfFile);
                        const stat = fs.statSync(filePath);

                        // Check if file is complete (size > 0)
                        if (stat.size > 0) {
                            downloadedFile = pdfFile;
                            console.log('✅ [Puppeteer] TIS file downloaded (new file):', downloadedFile);
                            break;
                        } else {
                            console.log(`⏳ [Puppeteer] File ${pdfFile} found but size is 0, waiting...`);
                        }
                    }
                    // Check recently modified files as fallback
                    else if (recentlyModifiedFiles.length > 0) {
                        const pdfFile = recentlyModifiedFiles[0];
                        const filePath = path.join(downloadPath, pdfFile);
                        const stat = fs.statSync(filePath);

                        if (stat.size > 0) {
                            downloadedFile = pdfFile;
                            console.log('✅ [Puppeteer] TIS file downloaded (modified existing file):', downloadedFile);
                            break;
                        }
                    }
                } catch (e) {
                    // Directory might not exist yet or other error
                    console.log(`⚠️ [Puppeteer] Error reading download directory: ${e}`);
                }
            }

            if (downloadedFile) {
                console.log('✅ [Puppeteer] TIS download completed successfully');

                // Rename file with timestamp to make it unique (IST timezone)
                const now = new Date();
                const istDate = now.toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                });
                // Format: DD/MM/YYYY, HH:MM:SS -> DD-MM-YYYY_HH-MM-SS
                const timestamp = istDate.replace(/\//g, '-').replace(', ', '_').replace(/:/g, '-');
                const fileExt = path.extname(downloadedFile);
                const fileBase = path.basename(downloadedFile, fileExt);
                const newFileName = `${fileBase}_${timestamp}${fileExt}`;

                const oldPath = path.join(downloadPath, downloadedFile);
                const newPath = path.join(downloadPath, newFileName);

                try {
                    fs.renameSync(oldPath, newPath);
                    console.log(`📝 [Puppeteer] Renamed file to: ${newFileName}`);
                    downloadedFile = newFileName;
                } catch (e) {
                    console.log(`⚠️ [Puppeteer] Could not rename file: ${e}`);
                    // Continue with original filename
                }

                onProgress?.('Download completed');

                return {
                    success: true,
                    message: 'TIS downloaded successfully',
                    filePath: path.join(downloadPath, downloadedFile)
                };
            } else {
                // Fallback: Check if file was downloaded to default Downloads folder
                console.log('⚠️ [Puppeteer] File not found in configured path, checking default Downloads folder...');
                const defaultDownloadsPath = require('os').homedir() + '/Downloads';

                try {
                    const defaultFiles = fs.readdirSync(defaultDownloadsPath);
                    console.log(`📂 [Puppeteer] Found ${defaultFiles.length} total files in Downloads folder`);

                    const pdfFiles = defaultFiles.filter((file: string) => file.endsWith('.pdf'));
                    console.log(`📄 [Puppeteer] Found ${pdfFiles.length} PDF files`);

                    const recentPdfFiles = defaultFiles.filter((file: string) => {
                        if (!file.endsWith('.pdf')) return false;
                        const filePath = path.join(defaultDownloadsPath, file);
                        const stat = fs.statSync(filePath);
                        // Check if file was created in the last 60 seconds
                        const fileAge = Date.now() - stat.mtimeMs;
                        const isTIS = file.toLowerCase().includes('tis');

                        console.log(`  📄 ${file}: age=${Math.round(fileAge / 1000)}s, isTIS=${isTIS}`);

                        return fileAge < 60000 && isTIS;
                    });

                    console.log(`✅ [Puppeteer] Found ${recentPdfFiles.length} recent TIS PDF files`);

                    if (recentPdfFiles.length > 0) {
                        const foundFile = recentPdfFiles[0];
                        console.log(`✅ [Puppeteer] Found TIS file in default Downloads: ${foundFile}`);
                        return {
                            success: true,
                            message: 'TIS downloaded successfully (found in default Downloads folder)',
                            filePath: path.join(defaultDownloadsPath, foundFile)
                        };
                    }
                } catch (e) {
                    console.log('⚠️ [Puppeteer] Could not check default Downloads folder:', e);
                }

                throw new Error('Download timeout - file not found after 30 seconds');
            }
        } catch (error: any) {
            console.error('❌ [Puppeteer] TIS Download error:', error);
            onProgress?.('❌ ' + error.message);
            throw error;
        } finally {
            // Always close the browser, even if there was an error
            try {
                await browser.close();
                console.log('🔒 [Puppeteer] Browser closed');
            } catch (e) {
                console.log('⚠️ [Puppeteer] Error closing browser:', e);
            }
        }
    }

    /**
     * Logout and clear cookies
     */
    async logout(cookies: any[]): Promise<{ success: boolean; message?: string }> {
        console.log('🚪 [Puppeteer] Logout started');
        const browser = await puppeteer.launch(this.getLaunchOptions());

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
