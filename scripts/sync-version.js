const { readFileSync, writeFileSync } = require("fs");
const { resolve } = require("path");
const { execSync } = require("child_process");

try {
  // Get new version from package.json
  const packageJsonPath = resolve(process.cwd(), "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  const newVersion = packageJson.version;

  if (!newVersion) {
    throw new Error("Could not find version in package.json");
  }

  console.log(`Syncing version to ${newVersion}...`);

  // 1. Update tauri.conf.json
  const tauriConfPath = resolve(process.cwd(), "src-tauri/tauri.conf.json");
  const tauriConf = JSON.parse(readFileSync(tauriConfPath, "utf-8"));

  // Eğer package köke taşındıysa aşağıdaki şekilde kontrol edin / güncelleyin
  if (!tauriConf.package) {
    throw new Error("Could not find package in tauri.conf.json");
  }

  tauriConf.package.version = newVersion;
  writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + "\n");
  console.log("✅ Updated src-tauri/tauri.conf.json");
  // stage tauri config so npm's auto commit will include it
  execSync(`git add ${tauriConfPath}`, { stdio: "inherit" });
  console.log("✅ Staged src-tauri/tauri.conf.json");

  // 2. Update Cargo.toml
  const cargoPath = resolve(process.cwd(), "src-tauri/Cargo.toml");
  let cargoContent = readFileSync(cargoPath, "utf-8");
  const cargoVersionRegex = /^version\s*=\s*"[^"]+"/m;

  if (!cargoVersionRegex.test(cargoContent)) {
    throw new Error("Could not find version field in Cargo.toml");
  }

  cargoContent = cargoContent.replace(
    cargoVersionRegex,
    `version = "${newVersion}"`
  );
  writeFileSync(cargoPath, cargoContent);
  console.log("✅ Updated src-tauri/Cargo.toml");
  execSync(`git add ${cargoPath}`, { stdio: "inherit" });
  console.log("✅ Staged src-tauri/Cargo.toml");

  // 3. Update data/version.ts
  const versionTsPath = resolve(process.cwd(), "data/version.ts");
  let versionTsContent = readFileSync(versionTsPath, "utf-8");
  const versionTsRegex = /export const VERSION = '[^']+'/;

  if (!versionTsRegex.test(versionTsContent)) {
    throw new Error("Could not find VERSION in version.ts");
  }

  versionTsContent = versionTsContent.replace(
    versionTsRegex,
    `export const VERSION = '${newVersion}'`
  );
  writeFileSync(versionTsPath, versionTsContent);
  console.log("✅ Updated data/version.ts");
  execSync(`git add ${versionTsPath}`, { stdio: "inherit" });
  console.log("✅ Staged data/version.ts");

  // 4. Update .wxs file (MSI version)
  const wsxPath = resolve(process.cwd(), "src-tauri/wix/main.wxs");
  let wsxContent = readFileSync(wsxPath, "utf-8");

  // Wix Version regex: Version="1.6.2"
  const wsxVersionRegex = /Version="[^"]+"/;

  if (!wsxVersionRegex.test(wsxContent)) {
    throw new Error("Could not find Version field in main.wxs");
  }

  wsxContent = wsxContent.replace(wsxVersionRegex, `Version="${newVersion}"`);

  writeFileSync(wsxPath, wsxContent);
  console.log("✅ Updated src-tauri/wix/main.wxs");
  execSync(`git add ${wsxPath}`, { stdio: "inherit" });
  console.log("✅ Staged src-tauri/wix/main.wxs");

  console.log("✅ Version sync complete!");
  process.exit(0);
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
