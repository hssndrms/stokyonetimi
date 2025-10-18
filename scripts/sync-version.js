const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');

try {
  // Get new version from package.json
  const packageJsonPath = resolve(process.cwd(), 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  const newVersion = packageJson.version;

  console.log('Current version:', newVersion);

  // Update tauri.conf.json
  const tauriConfPath = resolve(process.cwd(), 'src-tauri/tauri.conf.json');
  const tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf-8'));
  
  if (tauriConf.tauri && tauriConf.tauri.package) {
    tauriConf.tauri.package.version = newVersion;
    writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2));
    console.log('Updated tauri.conf.json');
  }

  // Create/update version.ts
  const versionTs = `export const VERSION = '${newVersion}';\n`;
  writeFileSync(resolve(process.cwd(), 'data/version.ts'), versionTs);
  console.log('Updated version.ts');

} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
