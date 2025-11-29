import { Page, BrowserContext } from 'playwright';
import { LoginResponse, CookieData, ProgressCallback } from './auth.types';
import { NavigationHelper } from '../browser/navigation.helper';

export class AuthService {
    private abortController: AbortController | null = null;

    /**
     * Login to Income Tax portal
     */
    async login(
        page: Page,
        context: BrowserContext,
        pan: string,
        password: string,
        onProgress?: ProgressCallback
    ): Promise<LoginResponse> {
        console.log('🤖 [Auth] Login started for PAN:', pan);

        this.abortController = new AbortController();

        try {
            if (this.abortController.signal.aborted) throw new Error('Cancelled');

            // Navigate to login page
            onProgress?.('Navigating to login page...');
            await NavigationHelper.navigateTo(page, 'https://eportal.incometax.gov.in/iec/foservices/#/login');
            await NavigationHelper.delay(5000);

            if (this.abortController.signal.aborted) throw new Error('Cancelled');

            // Enter PAN
            onProgress?.('Entering PAN...');
            await page.waitForSelector('#panAdhaarUserId', { timeout: 15000 });
            await page.fill('#panAdhaarUserId', pan);
            await NavigationHelper.delay(2000);

            if (this.abortController.signal.aborted) throw new Error('Cancelled');

            // Setup response listener for PAN validation
            const validationResponsePromise = page.waitForResponse(
                async (response) => {
                    try {
                        const request = response.request();
                        if (request.method() !== 'POST') return false;
                        const text = await response.text();
                        return text.includes('"entityType":"PAN"') || text.includes('"entityType": "PAN"');
                    } catch (e) {
                        return false;
                    }
                },
                { timeout: 8000 }
            ).catch((): null => null);

            // Click Continue button
            onProgress?.('Clicking Continue...');
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const continueBtn = btns.find(b => b.textContent?.includes('Continue'));
                if (continueBtn && continueBtn instanceof HTMLElement) continueBtn.click();
            });

            // Check validation response
            const validationResponse = await validationResponsePromise;
            if (validationResponse) {
                try {
                    const data = await validationResponse.json();
                    console.log('🔎 [Auth] PAN Validation Response:', JSON.stringify(data));

                    if (data.secLoginOptions && data.secLoginOptions.trim() !== '') {
                        console.error(`❌ [Auth] Security option enabled: ${data.secLoginOptions}`);
                        throw new Error(`Cannot able to fetch profile: ${data.secLoginOptions} is enabled. Remove this first to use`);
                    }
                } catch (e: any) {
                    if (e.message && e.message.includes('Cannot able to fetch profile')) {
                        throw e;
                    }
                    console.log('⚠️ [Auth] Error parsing validation response:', e.message);
                }
            } else {
                console.log('⚠️ [Auth] Validation response not captured (timeout), proceeding...');
            }

            await NavigationHelper.delay(4000);

            if (this.abortController.signal.aborted) throw new Error('Cancelled');

            // Check secure access checkbox
            onProgress?.('Checking secure access checkbox...');
            await page.waitForSelector('#passwordCheckBox-input', { timeout: 15000 });
            await page.click('#passwordCheckBox-input');
            await NavigationHelper.delay(1000);

            if (this.abortController.signal.aborted) throw new Error('Cancelled');

            // Enter password
            onProgress?.('Entering password...');
            await page.waitForSelector('#loginPasswordField', { timeout: 15000 });
            await page.fill('#loginPasswordField', password);
            await NavigationHelper.delay(2000);

            if (this.abortController.signal.aborted) throw new Error('Cancelled');

            // Click Login button
            onProgress?.('Clicking Login...');
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const loginBtn = btns.find(b => b.textContent?.includes('Continue'));
                if (loginBtn && loginBtn instanceof HTMLElement) loginBtn.click();
            });

            await NavigationHelper.delay(3000);

            if (this.abortController.signal.aborted) throw new Error('Cancelled');

            // Handle dual login if detected
            await this.handleDualLogin(page, onProgress);

            if (this.abortController.signal.aborted) throw new Error('Cancelled');

            // Check for invalid credentials
            const errorCheck = await page.textContent('body');
            if (errorCheck?.includes('Invalid') || errorCheck?.includes('incorrect')) {
                console.error('❌ [Auth] Invalid credentials');
                throw new Error('Invalid PAN or password');
            }

            // Wait for dashboard to load
            try {
                await page.waitForFunction(
                    () => document.body.innerText.includes('Dashboard') ||
                        document.body.innerText.includes('Welcome') ||
                        window.location.href.includes('dashboard'),
                    { timeout: 15000 }
                );
                console.log('✅ [Auth] Dashboard detected');
            } catch (e) {
                console.log('⚠️ [Auth] Dashboard wait timed out, proceeding anyway...');
            }

            // Wait for AuthToken to be set
            await NavigationHelper.delay(10000);

            // Capture AuthToken and cookies
            const result = await this.captureAuthToken(page, context, onProgress);

            return result;

        } catch (error: any) {
            console.error('\n========================================');
            console.error('❌ [Auth] Login failed!');
            console.error('Error:', error.message);
            console.error('========================================\n');

            if (error.message !== 'Cancelled') {
                onProgress?.('❌ ' + error.message);
                return { success: false, message: error.message };
            }
            throw error; // Re-throw 'Cancelled' error
        }
    }

    /**
     * Handle dual login scenario
     */
    private async handleDualLogin(page: Page, onProgress?: ProgressCallback): Promise<void> {
        const pageText = await page.textContent('body');
        if (pageText?.includes('Dual Login') || (pageText?.includes('session') && pageText?.includes('active'))) {
            console.log('⚠️ [Auth] Dual login detected');
            onProgress?.('Dual login detected, handling session...');

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
                try {
                    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 });
                } catch (e) {
                    await NavigationHelper.delay(3000);
                }
            } else {
                console.log('⚠️ [Auth] Login Here button not found');
            }
        }
    }

    /**
     * Capture AuthToken from cookies or storage
     */
    private async captureAuthToken(
        page: Page,
        context: BrowserContext,
        onProgress?: ProgressCallback
    ): Promise<LoginResponse> {
        console.log('🕵️ [Auth] Starting aggressive search for AuthToken...');
        let authToken: any = null;
        let cookies: any[] = [];

        // Aggressive polling for AuthToken
        for (let attempt = 1; attempt <= 10; attempt++) {
            console.log(`  → Attempt ${attempt}/10 to find AuthToken...`);

            // Get cookies from context
            cookies = await context.cookies();
            authToken = cookies.find(c => c.name === 'AuthToken');

            if (authToken) {
                console.log('  ✅ Found AuthToken via context.cookies()!');
                break;
            }

            // Check document.cookie directly
            const docCookies = await page.evaluate(() => document.cookie);
            console.log(`  📄 document.cookie: ${docCookies.substring(0, 100)}...`);
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

            if (attempt < 10) await NavigationHelper.delay(3000);
        }

        // If still missing and on dashboard, try reload
        if (!authToken) {
            const pageContent = await page.content();
            if (pageContent.includes('Dashboard') || pageContent.includes('Welcome') || pageContent.includes('My Account')) {
                console.log('⚠️ [Auth] Dashboard visible but AuthToken missing. Reloading page...');
                await page.reload({ waitUntil: 'networkidle' });
                await NavigationHelper.delay(5000);

                cookies = await context.cookies();
                authToken = cookies.find(c => c.name === 'AuthToken');
                if (authToken) console.log('✅ [Auth] AuthToken found after reload!');
            }
        }

        console.log('🍪 [Auth] Final cookie count:', cookies.length);
        if (authToken) console.log('✅ [Auth] AuthToken captured:', authToken.value.substring(0, 10) + '...');

        let capturedTokenFromNetwork = '';

        // Try to capture from network if not in cookies
        if (!authToken) {
            console.log('🔍 [Auth] AuthToken cookie missing, waiting for network activity...');
            try {
                await page.waitForResponse(
                    async (response) => {
                        const request = response.request();
                        const headers = request.headers();
                        if (headers['authorization'] || headers['auth-token'] || headers['authtoken']) {
                            console.log('🎯 [Auth] Found auth header in request to:', request.url());
                            capturedTokenFromNetwork = headers['authorization'] || headers['auth-token'] || headers['authtoken'];
                            return true;
                        }
                        return false;
                    },
                    { timeout: 5000 }
                ).catch((): null => null);
            } catch (e) {
                console.log('⚠️ [Auth] No auth headers found in network traffic');
            }
        }

        // Check Local/Session Storage
        if (!authToken && !capturedTokenFromNetwork) {
            console.log('🔍 [Auth] Checking Local/Session Storage for ANY data...');
            const storageData = await page.evaluate(() => {
                const local: Record<string, string> = {};
                const session: Record<string, string> = {};

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

            console.log('📦 [Auth] Storage Dump:', JSON.stringify(storageData, null, 2));

            const allValues = [...Object.values(storageData.local), ...Object.values(storageData.session)];
            for (const val of allValues) {
                if (val.includes('eyJh') || val.length > 50) {
                    console.log('❓ [Auth] Potential token found in storage:', val.substring(0, 20) + '...');
                }
            }
        }

        // Return result
        if (authToken || capturedTokenFromNetwork) {
            const tokenVal = authToken ? authToken.value : capturedTokenFromNetwork;
            console.log('✅ [Auth] Login successful - AuthToken captured');
            onProgress?.('✅ Login successful! AuthToken captured');

            if (!authToken && capturedTokenFromNetwork) {
                cookies.push({
                    name: 'AuthToken',
                    value: capturedTokenFromNetwork,
                    domain: '.incometax.gov.in',
                    path: '/',
                    httpOnly: true,
                    secure: true
                } as any);
            }

            return { success: true, cookies, authToken: tokenVal };
        } else {
            console.warn('⚠️ [Auth] No AuthToken cookie found');
            console.log('📋 [Auth] Available cookies:', JSON.stringify(cookies.map(c => ({ name: c.name, domain: c.domain })), null, 2));

            const finalPageContent = await page.textContent('body');
            console.log('📄 [Auth] Checking page content for success indicators...');

            if (finalPageContent?.includes('Dashboard') || finalPageContent?.includes('Welcome') ||
                finalPageContent?.includes('My Account') || finalPageContent?.includes('e-Filing')) {
                console.log('✅ [Auth] Login appears successful (found dashboard indicators), returning all cookies');
                onProgress?.('✅ Login successful! Session cookies captured');
                return { success: true, cookies };
            }

            console.error('❌ [Auth] Login failed - no success indicators found on page');
            onProgress?.('❌ Login failed - no AuthToken received');
            throw new Error('Login failed - no AuthToken received');
        }
    }

    /**
     * Abort current login operation
     */
    abort(): void {
        this.abortController?.abort();
    }
}
