import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';

puppeteer.use(StealthPlugin());

export class PuppeteerService {
    private abortController: AbortController | null = null;

    async login(pan: string, password: string, onProgress?: (status: string) => void): Promise<{ success: boolean; cookies?: any[]; authToken?: string; message?: string }> {
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
            onProgress?.('Clicking Continue...');
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const continueBtn = btns.find(b => b.textContent?.includes('Continue'));
                if (continueBtn) continueBtn.click();
            });

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
                onProgress?.('Dual login detected, clicking Login Here...');
                await page.evaluate(() => {
                    const allElements = Array.from(document.querySelectorAll('*'));
                    const loginHereBtn = allElements.find(el =>
                        el.textContent && el.textContent.trim() === 'Login Here' &&
                        (el.tagName === 'BUTTON' || (el as HTMLElement).onclick || (el as HTMLElement).style.cursor === 'pointer')
                    );
                    if (loginHereBtn) {
                        (loginHereBtn as HTMLElement).click();
                    }
                });
                await new Promise(resolve => setTimeout(resolve, 5000));
            } else {
                await new Promise(resolve => setTimeout(resolve, 7000));
            }

            if (this.abortController.signal.aborted) throw new Error('Cancelled');
            onProgress?.('Capturing cookies...');
            const cookies = await page.cookies();
            const authToken = cookies.find(c => c.name === 'AuthToken');

            await browser.close();
            onProgress?.('Browser closed');

            if (authToken) {
                onProgress?.('✅ Login successful! AuthToken captured');
                return { success: true, cookies, authToken: authToken.value };
            } else {
                onProgress?.('❌ Login failed - no AuthToken received');
                throw new Error('Login failed - no AuthToken received');
            }
        } catch (error) {
            await browser.close();
            if (error.message !== 'Cancelled') {
                onProgress?.('❌ ' + error.message);
            }
            throw error;
        }
    }

    abort() {
        this.abortController?.abort();
    }
}

export default new PuppeteerService();
