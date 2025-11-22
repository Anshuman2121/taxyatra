const fs = require('fs-extra');
const path = require('path');

exports.default = async function (context) {
    const appOutDir = context.appOutDir;
    const platform = context.electronPlatformName;

    console.log('Running afterPack hook...');
    console.log('Platform:', platform);
    console.log('App output directory:', appOutDir);

    // Determine the resources path based on platform
    let resourcesPath;
    if (platform === 'darwin') {
        resourcesPath = path.join(appOutDir, `${context.packager.appInfo.productFilename}.app`, 'Contents', 'Resources');
    } else if (platform === 'win32') {
        resourcesPath = path.join(appOutDir, 'resources');
    } else {
        resourcesPath = path.join(appOutDir, 'resources');
    }

    console.log('Resources path:', resourcesPath);

    // Copy better-sqlite3 native module
    const sqliteSource = path.join(__dirname, 'node_modules', 'better-sqlite3');
    const sqliteDest = path.join(resourcesPath, 'app.asar.unpacked', 'node_modules', 'better-sqlite3');

    try {
        console.log('Copying better-sqlite3 from:', sqliteSource);
        console.log('To:', sqliteDest);

        await fs.ensureDir(path.dirname(sqliteDest));
        await fs.copy(sqliteSource, sqliteDest, {
            filter: (src) => {
                // Only copy necessary files
                return !src.includes('node_modules') || src.includes('better-sqlite3');
            }
        });

        console.log('✅ Successfully copied better-sqlite3');
    } catch (error) {
        console.error('❌ Error copying better-sqlite3:', error);
        throw error;
    }
};
