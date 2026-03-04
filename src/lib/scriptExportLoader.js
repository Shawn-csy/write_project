let basicModulePromise = null;
let xlsxModulePromise = null;

export const loadBasicScriptExport = () => {
  if (!basicModulePromise) {
    basicModulePromise = import("./scriptExportBasic");
  }
  return basicModulePromise;
};

export const loadXlsxScriptExport = () => {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import("./scriptExportXlsx");
  }
  return xlsxModulePromise;
};
