import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

const execAsync = promisify(exec);

export interface BrowserInfo {
  name: string;
  id: string;
  path: string;
  icon?: string;
}

interface BrowserConfig {
  name: string;
  id: string;
  windowsPaths: string[];
  macPaths: string[];
  macBundleIds: string[];
}

const SUPPORTED_BROWSERS: BrowserConfig[] = [
  {
    name: 'Google Chrome',
    id: 'chrome',
    windowsPaths: [
      '%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe',
      '%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe',
      '%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe',
    ],
    macPaths: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
    macBundleIds: ['com.google.Chrome'],
  },
  {
    name: 'Microsoft Edge',
    id: 'edge',
    windowsPaths: [
      '%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe',
      '%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe',
    ],
    macPaths: ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'],
    macBundleIds: ['com.microsoft.edgemac'],
  },
  {
    name: 'Brave',
    id: 'brave',
    windowsPaths: [
      '%ProgramFiles%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      '%ProgramFiles(x86)%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      '%LocalAppData%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    ],
    macPaths: ['/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'],
    macBundleIds: ['com.brave.Browser'],
  },
  {
    name: 'Chromium',
    id: 'chromium',
    windowsPaths: [
      '%ProgramFiles%\\Chromium\\Application\\chrome.exe',
      '%LocalAppData%\\Chromium\\Application\\chrome.exe',
    ],
    macPaths: ['/Applications/Chromium.app/Contents/MacOS/Chromium'],
    macBundleIds: ['org.chromium.Chromium'],
  },
  {
    name: 'Opera',
    id: 'opera',
    windowsPaths: [
      '%ProgramFiles%\\Opera\\launcher.exe',
      '%LocalAppData%\\Programs\\Opera\\launcher.exe',
    ],
    macPaths: ['/Applications/Opera.app/Contents/MacOS/Opera'],
    macBundleIds: ['com.operasoftware.Opera'],
  },
  {
    name: 'Vivaldi',
    id: 'vivaldi',
    windowsPaths: [
      '%ProgramFiles%\\Vivaldi\\Application\\vivaldi.exe',
      '%LocalAppData%\\Vivaldi\\Application\\vivaldi.exe',
    ],
    macPaths: ['/Applications/Vivaldi.app/Contents/MacOS/Vivaldi'],
    macBundleIds: ['com.vivaldi.Vivaldi'],
  },
];

class BrowserService {
  private selectedBrowserPath: string | null = null;
  private configPath: string;

  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'browser-config.json');
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        if (config.browserPath && fs.existsSync(config.browserPath) && this.isValidBrowserPath(config.browserPath)) {
          this.selectedBrowserPath = config.browserPath;
          console.log('🌐 [Browser] Loaded saved browser:', this.selectedBrowserPath);
        } else if (config.browserPath) {
          // Clear invalid saved path
          console.log('⚠️ [Browser] Clearing invalid saved browser path:', config.browserPath);
          this.selectedBrowserPath = null;
          this.saveConfig();
        }
      }
    } catch (error) {
      console.error('⚠️ [Browser] Failed to load config:', error);
    }
  }

  private isValidBrowserPath(browserPath: string): boolean {
    // Exclude internal/cached browsers from puppeteer, pyppeteer, etc.
    const excludePatterns = [
      'pyppeteer',
      'puppeteer',
      'Application Support',
      'Library/Caches',
      '.cache',
      'node_modules',
    ];
    
    const lowerPath = browserPath.toLowerCase();
    return !excludePatterns.some(pattern => lowerPath.includes(pattern.toLowerCase()));
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(
        this.configPath,
        JSON.stringify({ browserPath: this.selectedBrowserPath }, null, 2)
      );
      console.log('💾 [Browser] Config saved');
    } catch (error) {
      console.error('⚠️ [Browser] Failed to save config:', error);
    }
  }

  private expandWindowsPath(p: string): string {
    return p
      .replace(/%ProgramFiles%/gi, process.env.ProgramFiles || 'C:\\Program Files')
      .replace(/%ProgramFiles\(x86\)%/gi, process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)')
      .replace(/%LocalAppData%/gi, process.env.LOCALAPPDATA || '');
  }

  async detectBrowsers(): Promise<BrowserInfo[]> {
    const platform = process.platform;
    const browsers: BrowserInfo[] = [];

    console.log('🔍 [Browser] Detecting browsers on', platform);

    for (const browser of SUPPORTED_BROWSERS) {
      const browserPath = await this.findBrowserPath(browser, platform);
      if (browserPath) {
        browsers.push({
          name: browser.name,
          id: browser.id,
          path: browserPath,
        });
        console.log(`✅ [Browser] Found ${browser.name} at ${browserPath}`);
      }
    }

    return browsers;
  }

  private async findBrowserPath(browser: BrowserConfig, platform: string): Promise<string | null> {
    if (platform === 'win32') {
      return this.findWindowsBrowser(browser);
    } else if (platform === 'darwin') {
      return this.findMacBrowser(browser);
    }
    return null;
  }

  private findWindowsBrowser(browser: BrowserConfig): string | null {
    for (const p of browser.windowsPaths) {
      const expandedPath = this.expandWindowsPath(p);
      if (fs.existsSync(expandedPath)) {
        return expandedPath;
      }
    }
    return null;
  }

  private async findMacBrowser(browser: BrowserConfig): Promise<string | null> {
    // First check direct paths (these are always valid system locations)
    for (const p of browser.macPaths) {
      if (fs.existsSync(p) && this.isValidBrowserPath(p)) {
        return p;
      }
    }

    // Try using mdfind for more thorough search
    for (const bundleId of browser.macBundleIds) {
      try {
        const { stdout } = await execAsync(`mdfind "kMDItemCFBundleIdentifier == '${bundleId}'" 2>/dev/null`);
        const appPaths = stdout.trim().split('\n').filter(p => p.length > 0);
        
        // Find the first valid app path (prefer /Applications)
        for (const appPath of appPaths) {
          if (!fs.existsSync(appPath) || !this.isValidBrowserPath(appPath)) {
            continue;
          }
          
          // Get the actual executable path
          const execPath = path.join(appPath, 'Contents', 'MacOS', path.basename(appPath, '.app'));
          if (fs.existsSync(execPath)) {
            return execPath;
          }
          // Try alternative executable names
          const macOSDir = path.join(appPath, 'Contents', 'MacOS');
          if (fs.existsSync(macOSDir)) {
            const files = fs.readdirSync(macOSDir);
            if (files.length > 0) {
              return path.join(macOSDir, files[0]);
            }
          }
        }
      } catch {
        // mdfind failed, continue to next
      }
    }

    return null;
  }

  async setBrowser(browserPath: string): Promise<{ success: boolean; message: string }> {
    if (!fs.existsSync(browserPath)) {
      return { success: false, message: 'Browser executable not found at specified path' };
    }

    this.selectedBrowserPath = browserPath;
    this.saveConfig();
    console.log('🌐 [Browser] Selected browser:', browserPath);
    return { success: true, message: 'Browser selected successfully' };
  }

  getSelectedBrowser(): string | null {
    return this.selectedBrowserPath;
  }

  async getSelectedBrowserInfo(): Promise<BrowserInfo | null> {
    if (!this.selectedBrowserPath) return null;

    const browsers = await this.detectBrowsers();
    return browsers.find((b) => b.path === this.selectedBrowserPath) || {
      name: 'Custom Browser',
      id: 'custom',
      path: this.selectedBrowserPath,
    };
  }

  clearSelection(): void {
    this.selectedBrowserPath = null;
    this.saveConfig();
    console.log('🌐 [Browser] Selection cleared');
  }
}

export const browserService = new BrowserService();
