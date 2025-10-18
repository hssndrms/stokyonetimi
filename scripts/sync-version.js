const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');

// Get new version from package.json
const packageJsonPath = resolve(process.cwd(), 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const newVersion = packageJson.version;

if (!newVersion) {
  console.error('Could not find version in package.json');
  process.exit(1);
}

console.log(`Syncing version to ${newVersion}...`);

// 1. Update tauri.conf.json
try {
  const tauriConfPath = resolve(process.cwd(), 'src-tauri/tauri.conf.json');
  const tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf-8'));
  
  if (tauriConf.tauri && tauriConf.tauri.package) {
      tauriConf.tauri.package.version = newVersion;
      writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
      console.log('✅ Updated src-tauri/tauri.conf.json');
  } else {
      console.error('❌ Could not find tauri.package information in tauri.conf.json');
  }
} catch (error) {
    console.error('❌ Error updating src-tauri/tauri.conf.json: ', error);
    process.exit(1);
}


// 2. Update data/version.ts
try {
  const versionTsPath = resolve(process.cwd(), 'data/version.ts');
  let versionTsContent = readFileSync(versionTsPath, 'utf-8');
  versionTsContent = versionTsContent.replace(
    /(export const APP_VERSION = ')(.*)(';)/,
    `$1${newVersion}$3`
  );
  writeFileSync(versionTsPath, versionTsContent);
  console.log('✅ Updated data/version.ts');
} catch (error) {
    console.error('❌ Error updating data/version.ts:', error);
    process.exit(1);
}

console.log('Version sync complete.');