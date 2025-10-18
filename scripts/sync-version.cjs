const { readFileSync, writeFileSync, existsSync } = require('fs');
const { resolve } = require('path');
const { execSync } = require('child_process');

try {
  const root = process.cwd();

  const packageJsonPath = resolve(root, 'package.json');
  if (!existsSync(packageJsonPath)) throw new Error('package.json bulunamadı: ' + packageJsonPath);
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  if (!packageJson.version) throw new Error('package.json içinde version alanı yok.');
  console.log('package.json version =', packageJson.version);
  const newVersion = packageJson.version;

  const tauriConfPath = resolve(root, 'src-tauri/tauri.conf.json');
  if (!existsSync(tauriConfPath)) throw new Error('src-tauri/tauri.conf.json bulunamadı: ' + tauriConfPath);
  const tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf8'));

  if (!tauriConf.tauri || !tauriConf.tauri.package) {
    throw new Error('tauri.conf.json içinde tauri.package nesnesi bulunamadı.');
  }

  tauriConf.tauri.package.version = newVersion;
  writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2), 'utf8');
  console.log('Updated', tauriConfPath);

  const versionTsPath = resolve(root, 'data/version.ts');
  writeFileSync(versionTsPath, `export const VERSION = '${newVersion}';\n`, 'utf8');
  console.log('Updated', versionTsPath);

  // Opsiyonel: git add komutunu burada çalıştır, hata olursa bilgilendir
  try {
    execSync(`git add "${tauriConfPath}" "${versionTsPath}"`, { stdio: 'inherit' });
    console.log('Files staged with git add.');
  } catch (gitErr) {
    console.warn('git add başarısız oldu (CI ortamında git olmayabilir). Hata:', gitErr.message);
    // Git yoksa veya erişim yoksa script yine başarılı sayılabilir -> exit 0
  }

  process.exit(0);
} catch (error) {
  console.error('sync-version error:', error && error.stack ? error.stack : error.message);
  process.exit(1);
}
