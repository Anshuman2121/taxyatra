import { Browser, BrowserPlatform, install, resolveBuildId, detectBrowserPlatform } from '@puppeteer/browsers';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { findChrome } from 'find-chrome-bin';

export class ChromeManager {
    private static instance: ChromeManager;
    private executablePath: string | null = null;
    private isDownloading: boolean = false;

    private constructor() { }

    static getInstance(): ChromeManager {
        if (!ChromeManager.instance) {
            ChromeManager.instance = new ChromeManager();
        }
        return ChromeManager.instance;
    }

    /**
     * Initializes the Chrome Manager:
     * 1. Checks if Chrome is already available.
     * 2. If not, downloads a compatible Chromium version.
     * 3. Sets the executable path.
     */
    async init(onProgress?: (status: string) => void): Promise<string> {
        onProgress?.('Initializing Chrome Manager...');

        // 1. Try to find existing Chrome installation
        try {
            onProgress?.('Searching for Google Chrome...');
            const { executablePath } = await findChrome({});
            if (executablePath) {
                console.log('✅ [ChromeManager] Found system Chrome at:', executablePath);
                this.executablePath = executablePath;
                process.env.CHROME_PATH = executablePath;
                return executablePath;
            }
        } catch (error) {
            console.log('⚠️ [ChromeManager] System Chrome not found or error searching:', error);
        }

        // 2. If not found, check if we already downloaded it
        const userDataPath = app.getPath('userData');
        const cacheDir = path.join(userDataPath, 'browsers');

        // Definition of the browser we want (using Puppeteer's recommended version for the installed core)
        // We can't easily get the "exact" matching revision dynamically without importing puppeteer-core internals or hardcoding.
        // For stability, we'll pick a known stable build or use 'latest' for the channel.
        // However, it is safer to use a specific build ID if we want to ensure compatibility.
        // Let's use 'stable' channel mapping for Chrome.
        const browser = Browser.CHROME;
        const platform = detectBrowserPlatform();

        if (!platform) {
            throw new Error('Unsupported platform for Chrome Manager');
        }

        const buildId = await resolveBuildId(browser, platform, 'stable');
        console.log(`ℹ️ [ChromeManager] Target Build ID: ${buildId}`);

        // Check if we can find it in our cache manually? 
        // @puppeteer/browsers doesn't have a simple "is installed" check other than computing the path.
        // We will attempt to install/resolve. 'install' will return existing install if present.

        onProgress?.(`System Chrome not found. Preparing to download Chrome ${buildId}...`);

        this.isDownloading = true;
        try {
            console.log('⬇️ [ChromeManager] Starting download to:', cacheDir);
            const installedBrowser = await install({
                browser: browser,
                buildId: buildId,
                cacheDir: cacheDir,
                platform: platform,
                downloadProgressCallback: (downloadedBytes, totalBytes) => {
                    const percent = Math.round((downloadedBytes / totalBytes) * 100);
                    onProgress?.(`Downloading Chrome: ${percent}%`);
                }
            });

            this.executablePath = installedBrowser.executablePath;
            process.env.CHROME_PATH = this.executablePath;
            console.log('✅ [ChromeManager] Chrome setup complete. Path:', this.executablePath);
            return this.executablePath;

        } catch (error) {
            console.error('❌ [ChromeManager] Failed to download Chrome:', error);
            throw error;
        } finally {
            this.isDownloading = false;
        }
    }

    getExecutablePath(): string {
        if (!this.executablePath) {
            throw new Error('Chrome not initialized. Call init() first.');
        }
        return this.executablePath;
    }
}
