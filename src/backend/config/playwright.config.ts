import { LaunchOptions } from 'playwright';

export interface BrowserConfig {
    headless: boolean;
    args: string[];
    defaultViewport?: { width: number; height: number } | null;
    devtools?: boolean;
}

export const defaultBrowserConfig: LaunchOptions = {
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
    ]
};

export const visibleBrowserConfig: LaunchOptions = {
    headless: false,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--start-maximized'
    ]
};

export const downloadConfig = {
    behavior: 'allow' as const,
    timeout: 60000
};

export const navigationConfig = {
    waitUntil: 'networkidle' as const,
    timeout: 60000
};
