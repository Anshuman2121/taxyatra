import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerWix } from '@electron-forge/maker-wix';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

/**
 * Electron Forge Configuration for TaxYatra
 * 
 * IMPORTANT: This configuration fixes the better-sqlite3 native module issue
 * See BUILD-INSTRUCTIONS.md for detailed explanations
 * 
 * Key fixes:
 * 1. ASAR unpacking for .node files (native modules)
 * 2. AutoUnpackNativesPlugin for automatic native module detection
 * 3. Selective node_modules inclusion (better-sqlite3 and dependencies)
 * 4. Proper Squirrel.Windows configuration for professional installers
 */

const config: ForgeConfig = {
  packagerConfig: {
    // ASAR Configuration - Critical for better-sqlite3
    asar: true,
    icon: './build/icon',
    name: 'TaxYatra',
    executableName: 'TaxYatra',
    
    // Note: ignore is handled automatically by Vite plugin
    // AutoUnpackNativesPlugin handles native modules
  },
  rebuildConfig: {},
  makers: [
    // Windows Installer (WiX MSI)
    // WiX provides a professional MSI installer with:
    // - Installation location selection dialog
    // - Automatic detection of existing installations
    // - Proper uninstall/upgrade handling
    // - Start menu shortcuts
    new MakerWix({
      name: 'TaxYatra',
      description: 'Tax Return Management Application',
      manufacturer: 'anshuman2121',
      exe: 'TaxYatra.exe',
      
      // UI Configuration - Enable installer wizard with directory selection
      ui: {
        chooseDirectory: true,  // Allow user to choose installation directory
        images: {
          // Optional: Customize installer appearance
          // background: './build/installer-background.png',  // 493x312 px
          // banner: './build/installer-banner.png',  // 493x58 px
        }
      },
      
      // Icons - Must be absolute path to .ico file
      icon: './build/icon.ico',
      
      // Installation options
      defaultInstallMode: 'perUser',  // Per-user installation (set to 'perMachine' for all users)
      
      // Shortcuts
      shortcutFolderName: 'TaxYatra',
      shortcutName: 'TaxYatra',
      
      // Program Files folder name
      programFilesFolderName: 'TaxYatra',
      
      // Upgrade behavior - IMPORTANT: Keep the same upgradeCode for all versions
      // This allows WiX to detect existing installations and offer upgrade/uninstall
      upgradeCode: '3F8B6C1E-2D4A-4F3B-9A1E-7C8D5E2F6A3B',
      
      // Features
      features: {
        autoUpdate: false,
        autoLaunch: false,  // Don't auto-launch on startup
      },
      
      // Architecture
      arch: 'x64',
      
      // Signing (optional - uncomment if you have a code signing certificate)
      // windowsSign: {
      //   certificateFile: './path/to/certificate.pfx',
      //   certificatePassword: 'your-password',
      // },
    }, ['win32']),
    
    // Also keep Squirrel as alternative (simpler, auto-update capable)
    new MakerSquirrel({
      name: 'TaxYatra',
      authors: 'anshuman2121',
      description: 'Tax Return Management Application',
      setupIcon: './build/icon.ico',
      iconUrl: 'https://raw.githubusercontent.com/Anshuman2121/taxyatra/main/build/icon.ico',
      loadingGif: './build/install-spinner.gif',
      setupExe: 'TaxYatra-Squirrel-Setup.exe',
      noMsi: true
    }, ['win32']),
    
    // Also create a ZIP for portable version
    new MakerZIP({}, ['win32']),
    
    // macOS Installers
    new MakerDMG({
      format: 'ULFO'  // ULFO format for better compression
    }, ['darwin']),
    new MakerZIP({}, ['darwin']),
    
    // Linux Packages
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    // AutoUnpackNativesPlugin - Automatically detects and unpacks native modules
    // This works in conjunction with ASAR unpacking above
    new AutoUnpackNativesPlugin({}),
    
    new VitePlugin({
      build: [
        {
          entry: 'src/backend/index.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      
      // IMPORTANT: Disabled to allow unpacked native modules
      // If enabled, ASAR integrity checks would fail for unpacked .node files
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: false,
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],
};

export default config;
