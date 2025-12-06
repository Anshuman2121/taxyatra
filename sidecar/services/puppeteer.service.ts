import { PuppeteerCoreService } from './puppeteer/core.service';
import { LoginTask } from './puppeteer/tasks/login.task';
import { Download26ASTask } from './puppeteer/tasks/download-26as.task';
import { DownloadAISTask } from './puppeteer/tasks/download-ais.task';
import { DownloadTISTask } from './puppeteer/tasks/download-tis.task';

export class PuppeteerService {
    private static instance: PuppeteerService;
    private core: PuppeteerCoreService;

    private constructor() {
        this.core = PuppeteerCoreService.getInstance();
    }

    static getInstance(): PuppeteerService {
        if (!PuppeteerService.instance) {
            PuppeteerService.instance = new PuppeteerService();
        }
        return PuppeteerService.instance;
    }

    async init(userDataPath: string, onProgress?: (status: string) => void) {
        return this.core.init(userDataPath, onProgress);
    }

    async close() {
        return this.core.close();
    }

    async login(pan: string, password: string, onProgress?: (status: string) => void): Promise<{ success: boolean; cookies?: any[]; message?: string }> {
        return this.core.enqueueTask(async () => {
            const browser = await this.core.getBrowser();
            const page = await browser.newPage();
            const task = new LoginTask(page, onProgress);
            try {
                return await task.execute(pan, password);
            } finally {
                if (page && !page.isClosed()) await page.close();
            }
        });
    }

    async download26AS(
        pan: string,
        password: string,
        assessmentYear: string,
        downloadPath: string,
        onProgress?: (status: string) => void
    ): Promise<{ success: boolean; filePath?: string; message?: string }> {
        return this.core.enqueueTask(async () => {
            const browser = await this.core.getBrowser();
            const page = await browser.newPage();
            const task = new Download26ASTask(page, onProgress);
            try {
                return await task.execute(pan, password, assessmentYear, downloadPath);
            } finally {
                if (page && !page.isClosed()) await page.close();
            }
        });
    }

    async downloadAIS(
        pan: string,
        password: string,
        financialYear: string,
        downloadPath: string,
        captchaCallback: (image: string) => Promise<string>,
        onProgress?: (status: string) => void
    ): Promise<{ success: boolean; filePath?: string; message?: string }> {
        return this.core.enqueueTask(async () => {
            const browser = await this.core.getBrowser();
            const page = await browser.newPage();
            const task = new DownloadAISTask(page, onProgress);
            try {
                return await task.execute(pan, password, financialYear, downloadPath, captchaCallback);
            } finally {
                if (page && !page.isClosed()) await page.close();
            }
        });
    }

    async downloadTIS(
        pan: string,
        password: string,
        financialYear: string,
        downloadPath: string,
        onProgress?: (status: string) => void
    ): Promise<{ success: boolean; filePath?: string; message?: string }> {
        return this.core.enqueueTask(async () => {
            const browser = await this.core.getBrowser();
            const page = await browser.newPage();
            const task = new DownloadTISTask(page, onProgress);
            try {
                return await task.execute(pan, password, financialYear, downloadPath);
            } finally {
                if (page && !page.isClosed()) await page.close();
            }
        });
    }
}

export default PuppeteerService.getInstance();
