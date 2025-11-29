import { Page } from 'playwright';
import { NavigationHelper } from '../browser/navigation.helper';

export class DownloadHelper {
    /**
     * Wait for file download to complete
     */
    static async waitForDownload(
        page: Page,
        downloadPath: string,
        timeout: number = 60000
    ): Promise<string | null> {
        try {
            const download = await page.waitForEvent('download', { timeout });
            const fileName = download.suggestedFilename();
            const filePath = `${downloadPath}/${fileName}`;

            await download.saveAs(filePath);
            console.log('✅ [Download] File saved:', filePath);

            return filePath;
        } catch (error: any) {
            console.error('❌ [Download] Download failed:', error.message);
            return null;
        }
    }

    /**
     * Click element by text content
     */
    static async clickByText(page: Page, text: string): Promise<boolean> {
        return await page.evaluate((searchText) => {
            const elements = Array.from(document.querySelectorAll('button, a, span, div'));
            const element = elements.find(el => {
                const elText = el.textContent?.trim() || '';
                return elText === searchText || elText.includes(searchText);
            });

            if (element && element instanceof HTMLElement) {
                element.click();
                return true;
            }
            return false;
        }, text);
    }

    /**
     * Select option from dropdown by text
     */
    static async selectByText(page: Page, text: string): Promise<boolean> {
        return await page.evaluate((searchText) => {
            const selects = Array.from(document.querySelectorAll('select'));
            for (const select of selects) {
                const options = Array.from(select.options);
                const matchingOption = options.find(opt =>
                    opt.text.includes(searchText) || opt.value.includes(searchText)
                );
                if (matchingOption) {
                    select.value = matchingOption.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    console.log('✅ Selected option:', matchingOption.text);
                    return true;
                }
            }
            return false;
        }, text);
    }

    /**
     * Get element bounding box for mouse interaction
     */
    static async getElementBox(page: Page, selector: string): Promise<{ x: number; y: number } | null> {
        return await page.evaluate((sel) => {
            const element = document.querySelector(sel);
            if (element) {
                const rect = element.getBoundingClientRect();
                return {
                    x: rect.x + rect.width / 2,
                    y: rect.y + rect.height / 2
                };
            }
            return null;
        }, selector);
    }
}
