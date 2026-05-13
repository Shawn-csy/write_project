// Export functions are now handled by the server-side API.
// These loaders return the API-based implementations to maintain call-site compatibility.
import { exportScriptAsDocx, exportScriptAsXlsx } from "./api/export";
import { exportScriptAsFountain, exportScriptAsCsv, exportScriptAsPdf } from "./scriptExportBasic";

export const loadBasicScriptExport = () =>
  Promise.resolve({ exportScriptAsFountain, exportScriptAsCsv, exportScriptAsPdf, exportScriptAsDocx });

export const loadXlsxScriptExport = () =>
  Promise.resolve({ exportScriptAsXlsx });
