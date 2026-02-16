/**
 * Generate all app icon sizes from the source SVG.
 *
 * Usage:
 *   npm run generate-icons
 *
 * Produces:
 *   public/icon-1024.png  - Mac app icon (1024x1024)
 *   public/icon-256.png   - Windows app icon (256x256)
 *   public/icon-256.ico   - Windows app icon (ICO format)
 *   public/favicon-64.png - Favicon large (64x64)
 *   public/favicon-32.png - Favicon small (32x32)
 */

import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicFolder = path.join(__dirname, "..", "public");
const svgPath = path.join(publicFolder, "icon.svg");

if (!fs.existsSync(svgPath)) {
  console.error(`Error: Source SVG not found at ${svgPath}`);
  process.exit(1);
}

const sizes = [
  { name: "icon-1024.png", size: 1024 },
  { name: "icon-256.png", size: 256 },
  { name: "favicon-64.png", size: 64 },
  { name: "favicon-32.png", size: 32 },
];

console.log(`Source: ${svgPath}\n`);

for (const { name, size } of sizes) {
  const outPath = path.join(publicFolder, name);
  console.log(`  ${name} (${size}x${size})...`);
  execSync(`npx sharp-cli -i "${svgPath}" -o "${outPath}" resize ${size} ${size}`, {
    stdio: ["ignore", "ignore", "inherit"],
  });
}

/**
 * Generate Windows ICO from PNG (256x256)
 */
const pngPath = path.join(publicFolder, "icon-256.png");
const icoPath = path.join(publicFolder, "icon-256.ico");

console.log(`  icon-256.ico (256x256 ICO png-to-ico)...`);
execSync(`npx png-to-ico "${pngPath}" > "${icoPath}"`, {
  stdio: ["ignore", "ignore", "inherit"],
});

console.log('\nAll icons generated in "public" folder');
