import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = join(repositoryRoot, "dist-dev-studio-8890");
const viteBin = join(repositoryRoot, "node_modules/vite/bin/vite.js");

const result = spawnSync(process.execPath, [viteBin, "build", "--mode", "production", "--outDir", outputRoot], {
  cwd: repositoryRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    VITE_API_URL: "/api",
    VITE_DEPLOY_ENV: "development",
    VITE_FIREBASE_MEASUREMENT_ID: "",
  },
});

if (result.status !== 0) {
  throw new Error(`Dev Studio build failed with exit code ${result.status ?? "unknown"}`);
}
if (!existsSync(join(outputRoot, "index.html"))) {
  throw new Error("Dev Studio build completed without creating index.html.");
}

console.log(`Dev Studio static output is ready at ${outputRoot}.`);
