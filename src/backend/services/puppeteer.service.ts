import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';

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
