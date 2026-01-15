import express from "express";
import compression from "compression";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

app.use(compression());

// Serve static assets from dist, but NO index.html automatically
app.use(express.static("dist", { index: false }));

let indexHtml = "";
let fileMeta = {};

// Load resources once at startup
try {
  const indexPath = path.join(__dirname, "dist/index.html");
  if (fs.existsSync(indexPath)) {
    indexHtml = fs.readFileSync(indexPath, "utf-8");
  } else {
    console.warn("Available files in dist:", fs.readdirSync(path.join(__dirname, "dist")));
  }
} catch (e) {
  console.error("Failed to load index.html", e);
}

try {
  const metaPath = path.join(__dirname, "src/constants/fileMeta.generated.json");
  // NOTE: In production Docker helper, we might need to adjust where this file lives.
  // The build script outputs to src/constants/fileMeta.generated.json.
  // Vite build bundles the app, but doesn't necessarily copy this JSON to dist unless configured.
  // However, since we are running "node server.js" in the same container where we ran "npm run build",
  // the src/constants/fileMeta.generated.json should still exist in the src folder (or we handle it).
  // Actually, for cleaner deployment, we should read it from where it was generated.
  
  if (fs.existsSync(metaPath)) {
    const raw = fs.readFileSync(metaPath, "utf-8");
    fileMeta = JSON.parse(raw);
    console.log(`Loaded metadata for ${Object.keys(fileMeta).length} files.`);
  } else {
    console.warn(`Meta file not found at ${metaPath}`);
  }
} catch (e) {
  // Try dist location if we decide to copy it there
  console.error("Failed to load fileMeta", e);
}

app.get("*", (req, res) => {
  if (!indexHtml) {
    return res.status(404).send("Not Found: index.html missing");
  }

  const fileParam = req.query.file;
  let sentHtml = indexHtml;

  if (fileParam) {
    // Attempt to match the file key
    // fileParam could be "MyScript.fountain" or just "MyScript" (if extension hidden in display)
    // The keys in fileMeta are relative paths like "MyScript.fountain" or "Folder/MyScript.fountain"
    
    // Normalize fileParam for comparison (e.g. ensure extension ?) -- actually App.jsx uses display which usually matches the path relative
    let meta = fileMeta[fileParam];
    
    // Fuzzy search if exact match fails
    if (!meta) {
      const matchKey = Object.keys(fileMeta).find(key => {
         const baseKey = path.basename(key, '.fountain');
         const baseParam = path.basename(fileParam, '.fountain');
         return key === fileParam || baseKey === baseParam;
      });
      if (matchKey) meta = fileMeta[matchKey];
    }

    if (meta && (meta.title || meta.summary)) {
      const title = meta.title || "Screenplay Reader";
      const desc = (meta.summary || "線上閱讀、瀏覽與分享 Fountain 劇本的閱讀器。").replace(/"/g, '&quot;');
      
      // Inject title
      sentHtml = sentHtml.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
      
      // Inject og:title
      sentHtml = sentHtml.replace(
        /<meta property="og:title" content=".*?" \/>/, 
        `<meta property="og:title" content="${title}" />`
      );
      
      // Inject description (name)
      sentHtml = sentHtml.replace(
        /<meta name="description" content=".*?" \/>/, 
        `<meta name="description" content="${desc}" />`
      );
      
      // Inject og:description
      sentHtml = sentHtml.replace(
        /<meta property="og:description" content=".*?" \/>/, 
        `<meta property="og:description" content="${desc}" />`
      );
    }
  }

  // --- Runtime Env Injection for Cloud Run ---
  // Create a safe subset of env vars to pass to client
  const safeEnv = {
    VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    VITE_FIREBASE_MESSAGING_SENDER_ID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID,
    VITE_FIREBASE_MEASUREMENT_ID: process.env.VITE_FIREBASE_MEASUREMENT_ID,
    VITE_API_URL: process.env.VITE_API_URL
  };
  
  // Inject into <head>
  const envScript = `<script>window.__ENV__ = ${JSON.stringify(safeEnv)};</script>`;
  sentHtml = sentHtml.replace("</head>", `${envScript}</head>`);
  // ------------------------------------------

  res.setHeader("Content-Type", "text/html");
  res.send(sentHtml);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
