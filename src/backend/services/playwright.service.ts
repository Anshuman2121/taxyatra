import { BrowserManager } from './browser/browser.manager';
import { AuthService } from './auth/auth.service';
import { LogoutService } from './auth/logout.service';
import { Download26ASService } from './downloads/download-26as.service';
import { DownloadAISService } from './downloads/download-ais.service';
import { DownloadTISService } from './downloads/download-tis.service';
import { LoginResponse, LogoutResponse } from './auth/auth.types';
import { DownloadResponse } from './downloads/download.types';

/**
 * Main Playwright Service - Orchestrates all browser automation modules
 * Maintains API compatibility with the original Puppeteer service
 */
export class PlaywrightService {
    private browserManager: BrowserManager;
    private authService: AuthService;
    private logoutService: LogoutService;
    private download26ASService: Download26ASService;
    private downloadAISService: DownloadAISService;
    private downloadTISService: DownloadTISService;
    private abortController: AbortController | null = null;

    constructor() {
        this.browserManager = new BrowserManager();
        this.authService = new AuthService();
        this.logoutService = new LogoutService();
        this.download26ASService = new Download26ASService();
        this.downloadAISService = new DownloadAISService();
        this.downloadTISService = new DownloadTISService();
    }

    /**
     * Login to Income Tax portal
     */
    async login(
        pan: string,
        password: string,
        onProgress?: (status: string) => void
    ): Promise<LoginResponse> {
        console.log('🚀 [Playwright] Login started for PAN:', pan);

        this.abortController = new AbortController();

        try {
            onProgress?.('Starting browser...');
            const { browser, context, page } = await this.browserManager.launch(false);

            try {
                const result = await this.authService.login(page, context, pan, password, onProgress);
                await this.browserManager.close();
                return result;
            } catch (error: any) {
                await this.browserManager.close();
                throw error;
            }
        } catch (error: any) {
            console.error('❌ [Playwright] Login failed:', error.message);
            if (error.message !== 'Cancelled') {
                onProgress?.('❌ ' + error.message);
                return { success: false, message: error.message };
            }
            throw error;
        }
    }

    /**
     * Download Form 26AS
     */
    async download26AS(
        pan: string,
        password: string,
        assessmentYear: string,
        downloadPath: string,
        event: Electron.IpcMainInvokeEvent,
        onProgress?: (status: string) => void
    ): Promise<DownloadResponse> {
        console.log('📥 [Playwright] 26AS Download started for AY:', assessmentYear);

        try {
            onProgress?.('Starting browser...');
            const { browser, context, page } = await this.browserManager.launch(true);

            try {
                await this.browserManager.setupDownloadBehavior(page, downloadPath);
                const result = await this.download26ASService.download(
                    page,
                    context,
                    browser,
                    pan,
                    password,
                    assessmentYear,
                    downloadPath,
                    onProgress
                );
                await this.browserManager.close();
                return result;
            } catch (error: any) {
                await this.browserManager.close();
                throw error;
            }
        } catch (error: any) {
            console.error('❌ [Playwright] 26AS Download failed:', error.message);
            onProgress?.('❌ ' + error.message);
            return { success: false, message: error.message };
        }
    }

    /**
     * Download AIS (Annual Information Statement)
     */
    async downloadAIS(
        pan: string,
        password: string,
        financialYear: string,
        downloadPath: string,
        event: Electron.IpcMainInvokeEvent,
        onProgress?: (status: string) => void
    ): Promise<DownloadResponse> {
        console.log('📥 [Playwright] AIS Download started for F.Y.:', financialYear);

        try {
            onProgress?.('Starting browser...');
            const { browser, context, page } = await this.browserManager.launch(true);

            try {
                await this.browserManager.setupDownloadBehavior(page, downloadPath);
                const result = await this.downloadAISService.download(
                    page,
                    context,
                    browser,
                    pan,
                    password,
                    financialYear,
                    downloadPath,
                    event,
                    onProgress
                );
                await this.browserManager.close();
                return result;
            } catch (error: any) {
                await this.browserManager.close();
                throw error;
            }
        } catch (error: any) {
            console.error('❌ [Playwright] AIS Download failed:', error.message);
            onProgress?.('❌ ' + error.message);
            return { success: false, message: error.message };
        }
    }

    /**
     * Download TIS (Tax Information Statement)
     */
    async downloadTIS(
        pan: string,
        password: string,
        financialYear: string,
        downloadPath: string,
        event: Electron.IpcMainInvokeEvent,
        onProgress?: (status: string) => void
    ): Promise<DownloadResponse> {
        console.log('📥 [Playwright] TIS Download started for F.Y.:', financialYear);

        try {
            onProgress?.('Starting browser...');
            const { browser, context, page } = await this.browserManager.launch(true);

            try {
                await this.browserManager.setupDownloadBehavior(page, downloadPath);
                const result = await this.downloadTISService.download(
                    page,
                    context,
                    browser,
                    pan,
                    password,
                    financialYear,
                    downloadPath,
                    event,
                    onProgress
                );
                await this.browserManager.close();
                return result;
            } catch (error: any) {
                await this.browserManager.close();
                throw error;
            }
        } catch (error: any) {
            console.error('❌ [Playwright] TIS Download failed:', error.message);
            onProgress?.('❌ ' + error.message);
            return { success: false, message: error.message };
        }
    }

    /**
     * Logout from Income Tax portal
     */
    async logout(cookies: any[]): Promise<LogoutResponse> {
        console.log('🚪 [Playwright] Logout started');

        try {
            const { browser, context, page } = await this.browserManager.launch(false);

            try {
                const result = await this.logoutService.logout(page, context, cookies);
                await this.browserManager.close();
                return result;
            } catch (error: any) {
                await this.browserManager.close();
                throw error;
            }
        } catch (error: any) {
            console.error('❌ [Playwright] Logout failed:', error.message);
            return { success: false, message: error.message };
        }
    }

    /**
     * Abort current operation
     */
    abort(): void {
        this.authService.abort();
        this.abortController?.abort();
        console.log('🛑 [Playwright] Operation aborted');
    }
}

// Export singleton instance for backward compatibility
export default new PlaywrightService();
