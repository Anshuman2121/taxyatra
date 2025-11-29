import { Page } from 'playwright';
import { navigationConfig } from '../../config/playwright.config';

export class NavigationHelper {
    /**
     * Navigate to URL with retry logic
     */
    static async navigateTo(page: Page, url: string, retries: number = 3): Promise<void> {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                await page.goto(url, {
                    waitUntil: navigationConfig.waitUntil,
                    timeout: navigationConfig.timeout
                });
                console.log(`✅ [Navigation] Successfully navigated to: ${url}`);
                return;
            } catch (error: any) {
                if (attempt === retries) {
                    throw new Error(`Failed to navigate to ${url} after ${retries} attempts: ${error.message}`);
                }
                console.log(`⚠️ [Navigation] Attempt ${attempt} failed, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    /**
     * Wait for page to be ready
     */
    static async waitForPageReady(page: Page, timeout: number = 30000): Promise<void> {
        try {
            await page.waitForLoadState('networkidle', { timeout });
            console.log('✅ [Navigation] Page is ready');
        } catch (error) {
            console.log('⚠️ [Navigation] Page ready timeout, continuing anyway...');
        }
    }

    /**
     * Wait for element with retry
     */
    static async waitForElement(
        page: Page,
        selector: string,
        timeout: number = 15000
    ): Promise<void> {
        try {
            await page.waitForSelector(selector, { timeout, state: 'visible' });
            console.log(`✅ [Navigation] Element found: ${selector}`);
        } catch (error: any) {
            throw new Error(`Element not found: ${selector} - ${error.message}`);
        }
    }

    /**
     * Check if text exists on page
     */
    static async hasText(page: Page, text: string): Promise<boolean> {
        const content = await page.textContent('body');
        return content?.includes(text) || false;
    }

    /**
     * Wait for text to appear on page
     */
    static async waitForText(
        page: Page,
        text: string,
        timeout: number = 15000
    ): Promise<boolean> {
        try {
            await page.waitForFunction(
                (searchText) => document.body.innerText.includes(searchText),
                text,
                { timeout }
            );
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Safe delay helper
     */
    static async delay(ms: number): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, ms));
    }
}
