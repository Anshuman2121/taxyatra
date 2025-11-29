import { Page, BrowserContext } from 'playwright';
import { LogoutResponse } from './auth.types';
import { NavigationHelper } from '../browser/navigation.helper';

export class LogoutService {
    /**
     * Logout from Income Tax portal
     */
    async logout(page: Page, context: BrowserContext, cookies: any[]): Promise<LogoutResponse> {
        console.log('🚪 [Logout] Logout started');

        try {
            // Set cookies to maintain session
            await context.addCookies(cookies.map(cookie => ({
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain || '.incometax.gov.in',
                path: cookie.path || '/',
                httpOnly: cookie.httpOnly,
                secure: cookie.secure,
                sameSite: cookie.sameSite || 'Lax',
                expires: cookie.expires
            })));

            // Navigate to dashboard
            try {
                await page.goto('https://eportal.incometax.gov.in/iec/foservices/#/dashboard', {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });
            } catch (e) {
                console.log('⚠️ [Logout] Navigation timeout, continuing anyway...');
            }

            console.log('📄 [Logout] Page loaded, attempting logout...');
            await NavigationHelper.delay(3000);

            // Try to find and click logout
            try {
                await page.waitForSelector('button, a', { timeout: 5000 }).catch(() => { });

                const loggedOut = await page.evaluate(() => {
                    try {
                        const allElements = document.querySelectorAll('*');

                        for (const el of Array.from(allElements)) {
                            const text = el.textContent?.trim() || '';
                            const innerText = (el as HTMLElement).innerText?.trim() || '';

                            if (text === 'Log Out' || innerText === 'Log Out' ||
                                text.toLowerCase() === 'logout' || innerText.toLowerCase() === 'logout') {
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
                    console.log('✅ [Logout] Logout clicked');
                    await NavigationHelper.delay(2000);
                }
            } catch (e) {
                console.log('⚠️ [Logout] Logout click failed:', e);
            }

            console.log('✅ [Logout] Logout completed');
            return { success: true };

        } catch (error: any) {
            console.error('❌ [Logout] Logout failed:', error.message);
            return { success: false, message: error.message };
        }
    }
}
