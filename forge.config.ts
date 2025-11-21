import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerDMG } from '@electron-forge/maker-dmg';
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
    
    // CRITICAL FIX: Empty ignore array
    // This prevents Vite plugin from excluding node_modules
    // Allows AutoUnpackNativesPlugin to work correctly
    ignore: [],
  },
  rebuildConfig: {},
  makers: [
    // Windows Installer (Squirrel.Windows)
    // Installs to: %LocalAppData%\TaxYatra by default
    // For Program Files, user must run installer as admin
    new MakerSquirrel({
      name: 'TaxYatra',
      authors: 'anshuman2121',
      description: 'Tax Return Management Application',
      setupIcon: './build/icon.ico',
      iconUrl: 'https://raw.githubusercontent.com/Anshuman2121/taxyatra/main/build/icon.ico',
      loadingGif: './build/install-spinner.gif',
      setupExe: 'TaxYatra-Setup.exe',
      noMsi: true  // Use .exe installer, not MSI
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
