import { Page, ElementHandle } from 'puppeteer-core';

export abstract class BaseTask {
    protected page: Page;
    protected onProgress?: (status: string) => void;

    constructor(page: Page, onProgress?: (status: string) => void) {
        this.page = page;
        this.onProgress = onProgress;
    }

    protected log(message: string, type: 'info' | 'error' | 'warn' | 'success' = 'info') {
        const icon = type === 'info' ? 'ℹ️' : type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '✅';
        console.log(`${icon} [Puppeteer-Task] ${message}`);
        if (this.onProgress && type !== 'error') {
            // Only show major steps to user, or everything? 
            // Stick to specific onProgress calls in implementation for user-facing strings.
        }
    }

    protected async wait(ms: number) {
        await new Promise(resolve => setTimeout(resolve, ms));
    }

    protected async waitForSelector(selector: string, timeout = 10000): Promise<ElementHandle<Element> | null> {
        try {
            return await this.page.waitForSelector(selector, { timeout });
        } catch (e) {
            return null;
        }
    }

    protected async click(selector: string) {
        await this.page.click(selector);
    }

    /**
     * Common helper to find a button by text and click it
     */
    protected async clickButtonByText(text: string, partial = true) {
        await this.page.evaluate((txt, isPartial) => {
            const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a, span, div.button'));
            const match = buttons.find(b => {
                const content = (b.textContent || (b as HTMLInputElement).value || '').trim().toLowerCase();
                const search = txt.toLowerCase();
                return isPartial ? content.includes(search) : content === search;
            });
            if (match && match instanceof HTMLElement) match.click();
        }, text, partial);
    }

    /**
     * Checks for dual login and handles it
     */
    protected async handleDualLogin() {
        const pageText = await this.page.evaluate(() => document.body.innerText);
        if (pageText.includes('Dual Login') || (pageText.includes('session') && pageText.includes('active'))) {
            this.log('Dual login detected, handling...', 'warn');
            await this.clickButtonByText('Login Here');
            await this.wait(3000);
        }
    }

    /**
     * Returns true if dashboard or welcome message is found
     */
    protected async isLoggedIn(): Promise<boolean> {
        const content = await this.page.content(); // or evaluate innerText for speed
        return content.includes('Dashboard') || content.includes('Welcome') || content.includes('My Account') || content.includes('e-Filing');
    }
}
