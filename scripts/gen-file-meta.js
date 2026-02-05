import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  splitTitleAndBody,
  extractTitleEntries,
} from "../src/lib/parsers/titlePageParser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Adjust paths based on where the script is run from (usually root)
const scriptsDir = path.resolve(process.cwd(), "src/scripts_file");
const outputFile = path.resolve(process.cwd(), "src/constants/fileMeta.generated.json");

const entries = {};

// Summary keys to look for (case-insensitive)
const summaryKeys = [
  "summary",
  "synopsis",
  "logline",
  "description",
  "摘要",
  "簡介",
  "簡述",
  "說明",
];

const walk = (dir) => {
  const children = fs.readdirSync(dir, { withFileTypes: true });
  children.forEach((child) => {
    const full = path.join(dir, child.name);
    if (child.isDirectory()) {
      walk(full);
      return;
    }
    if (!child.isFile() || !full.endsWith(".fountain")) return;
    
    // Get file stats
    const stat = fs.statSync(full);
    const mtime = stat.mtime.toISOString();
    
    // Parse content for metadata
    let title = "";
    let summary = "";
    
    try {
      const content = fs.readFileSync(full, "utf-8");
      const preprocessed = content.replace(/\r\n/g, '\n');
      const { titleLines } = splitTitleAndBody(preprocessed);
      const titleEntries = extractTitleEntries(titleLines);
      
      // Find Title
      const titleEntry = titleEntries.find(e => e.key.toLowerCase() === "title");
      if (titleEntry && titleEntry.values.length) {
        title = titleEntry.values.join(" ");
      }
      
      // Find Summary
      const summaryEntry = titleEntries.find(e => {
        const k = e.key.toLowerCase();
        return summaryKeys.some(sk => k === sk || k.includes(sk));
      });
      
      if (summaryEntry && summaryEntry.values.length) {
        summary = summaryEntry.values.join(" ");
      } else {
        // Fallback to Note if no summary
        const noteEntry = titleEntries.find(e => e.key.toLowerCase() === "note");
        if (noteEntry && noteEntry.values.length) {
          summary = noteEntry.values.join(" ");
        }
      }
      
    } catch (err) {
      console.warn(`Failed to parse metadata for ${child.name}:`, err);
    }
    
    const rel = path.relative(scriptsDir, full).replace(/\\/g, "/");
    entries[rel] = {
      mtime,
      title: title || child.name.replace(/\.fountain$/, ""),
      summary: summary || ""
    };
  });
};

if (!fs.existsSync(scriptsDir)) {
  console.warn(`scripts directory not found: ${scriptsDir}`);
  console.warn("跳過產生檔案中繼資料（找不到 src/scripts_file/）");
  fs.writeFileSync(outputFile, JSON.stringify({}, null, 2));
  process.exit(0);
}

console.log("Scanning scripts...");
walk(scriptsDir);

fs.writeFileSync(outputFile, JSON.stringify(entries, null, 2));
console.log(`Generated ${Object.keys(entries).length} entries -> ${outputFile}`);
