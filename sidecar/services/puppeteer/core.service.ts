import { Browser, Page } from 'puppeteer-core';
import { addExtra } from 'puppeteer-extra';
// @ts-ignore
import puppeteerCore from 'puppeteer-core';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { ChromeManager } from '../chromeManager';

const puppeteer = addExtra(puppeteerCore);
puppeteer.use(StealthPlugin());

export class PuppeteerCoreService {
    private static instance: PuppeteerCoreService;
    private browser: Browser | null = null;
    private initPromise: Promise<void> | null = null;
    private taskQueue: Promise<any> = Promise.resolve();
    private userDataPath: string | null = null;

    private constructor() { }

    static getInstance(): PuppeteerCoreService {
        if (!PuppeteerCoreService.instance) {
            PuppeteerCoreService.instance = new PuppeteerCoreService();
        }
        return PuppeteerCoreService.instance;
    }

    async init(userDataPath: string, onProgress?: (status: string) => void): Promise<void> {
        this.userDataPath = userDataPath;
        if (this.browser && this.browser.isConnected()) {
            return;
        }

        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = (async () => {
            try {
                console.log('🚀 [PuppeteerCore] Initializing browser...');
                const executablePath = await ChromeManager.getInstance().init(userDataPath, (status) => {
                    console.log(`[ChromeManager] ${status}`);
                    onProgress?.(status);
                });

                const isHeadlessEnv = process.env.HEADLESS !== 'false';
                // In sidecar, we often want headful if triggered by user, but maybe headless for background?
                // Let's default to headful if not specified, or match Electron behavior (dev=headful, prod=headless?)
                // Actually, tax apps usually need headful for debugging/user confidence, OR hidden if optimized.
                // User said "Optimize" but also "Work like now". Electron was hidden?
                // In the original code: headless = app.isPackaged || !isDev; (So Prod = Headless).
                // We'll mimic this with an ENV var.
                const headless = isHeadlessEnv;

                console.log(`🚀 [PuppeteerCore] Launching browser (Headless: ${headless}, Path: ${executablePath})`);

                this.browser = await puppeteer.launch({
                    executablePath,
                    headless: headless,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-blink-features=AutomationControlled',
                        '--start-maximized',
                        '--disable-dev-shm-usage',
                        '--disable-gpu'
                    ],
                    defaultViewport: null,
                    devtools: false
                }) as unknown as Browser;


                this.browser.on('disconnected', () => {
                    console.log('⚠️ [PuppeteerCore] Browser disconnected!');
                    this.browser = null;
                });

                console.log('✅ [PuppeteerCore] Browser initialized successfully');
            } catch (error) {
                console.error('❌ [PuppeteerCore] Failed to initialize browser:', error);
                this.browser = null;
                throw error;
            } finally {
                this.initPromise = null;
            }
        })();

        return this.initPromise;
    }

    async close(): Promise<void> {
        if (this.browser) {
            console.log('🛑 [PuppeteerCore] Closing browser...');
            await this.browser.close();
            this.browser = null;
        }
    }

    async getBrowser(): Promise<Browser> {
        if (!this.browser || !this.browser.isConnected()) {
            if (this.userDataPath) {
                await this.init(this.userDataPath);
            } else {
                throw new Error('Browser not initialized and no userDataPath set. Call init() first.');
            }
        }
        if (!this.browser) throw new Error('Browser initialization failed');
        return this.browser;
    }

    /**
     * Queues a task effectively creating a mutex for browser operations.
     */
    async enqueueTask<T>(task: () => Promise<T>): Promise<T> {
        // Ensure initialized before queuing? Or inside?
        // Better inside to handle re-init if needed.
        const result = this.queueWrap(async () => {
            await this.getBrowser(); // Ensure browser is ready
            return task();
        });
        return result;
    }

    private async queueWrap<T>(task: () => Promise<T>): Promise<T> {
        // Chain the task to the queue
        const previousTask = this.taskQueue;
        let resolveTask: (value?: any) => void;
        const currentTaskPromise = new Promise<void>(resolve => { resolveTask = resolve; });

        // Update the queue to wait for this new task
        this.taskQueue = currentTaskPromise;

        // Wait for the previous task to finish (regardless of success/failure)
        try {
            await previousTask;
        } catch (e) {
            // Ignore previous errors
        }

        // Execute the current task
        try {
            return await task();
        } finally {
            resolveTask!();
        }
    }
}
