import { chromium, Browser, BrowserContext, Page, CDPSession } from 'playwright';
import { addExtra } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { defaultBrowserConfig, visibleBrowserConfig } from '../../config/playwright.config';

// Add stealth plugin to playwright
const playwrightWithStealth = addExtra(chromium);
playwrightWithStealth.use(StealthPlugin());

export class BrowserManager {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private page: Page | null = null;

    /**
     * Launch browser with specified configuration
     */
    async launch(visible: boolean = false): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
        const config = visible ? visibleBrowserConfig : defaultBrowserConfig;

        this.browser = await playwrightWithStealth.launch(config);
        this.context = await this.browser.newContext({
            viewport: visible ? null : { width: 1280, height: 720 }
        });

        // Add stealth scripts to avoid detection
        await this.context.addInitScript(() => {
            // Remove webdriver property
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
        });

        this.page = await this.context.newPage();

        console.log('🚀 [Browser] Launched successfully');
        return { browser: this.browser, context: this.context, page: this.page };
    }

    /**
     * Setup download behavior for the page
     */
    async setupDownloadBehavior(page: Page, downloadPath: string): Promise<void> {
        // Create CDP session for download configuration
        const client: CDPSession = await page.context().newCDPSession(page);
        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: downloadPath
        });
        console.log('📥 [Browser] Download path configured:', downloadPath);
    }

    /**
     * Close browser and cleanup resources
     */
    async close(): Promise<void> {
        try {
            if (this.page) {
                await this.page.close();
                this.page = null;
            }
            if (this.context) {
                await this.context.close();
                this.context = null;
            }
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
            }
            console.log('🔒 [Browser] Closed successfully');
        } catch (error: any) {
            console.error('⚠️ [Browser] Error during cleanup:', error.message);
        }
    }

    /**
     * Get current page instance
     */
    getPage(): Page | null {
        return this.page;
    }

    /**
     * Get current context instance
     */
    getContext(): BrowserContext | null {
        return this.context;
    }

    /**
     * Get current browser instance
     */
    getBrowser(): Browser | null {
        return this.browser;
    }
}
