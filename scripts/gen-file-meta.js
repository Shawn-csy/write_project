import fs from "fs";
import path from "path";

const scriptsDir = path.resolve(process.cwd(), "src/scripts_file");
const outputFile = path.resolve(process.cwd(), "src/constants/fileMeta.generated.json");

const entries = {};

const walk = (dir) => {
  const children = fs.readdirSync(dir, { withFileTypes: true });
  children.forEach((child) => {
    const full = path.join(dir, child.name);
    if (child.isDirectory()) {
      walk(full);
      return;
    }
    if (!child.isFile() || !full.endsWith(".fountain")) return;
    const stat = fs.statSync(full);
    const rel = path.relative(scriptsDir, full).replace(/\\/g, "/");
    entries[rel] = stat.mtime.toISOString();
  });
};

if (!fs.existsSync(scriptsDir)) {
  console.error(`scripts directory not found: ${scriptsDir}`);
  console.error("請確認劇本資料夾是否為 src/scripts_file/");
  process.exit(1);
}

walk(scriptsDir);

fs.writeFileSync(outputFile, JSON.stringify(entries, null, 2));
console.log(`Generated ${Object.keys(entries).length} entries -> ${outputFile}`);
