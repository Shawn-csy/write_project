const getEnv = (key: string) => {
  const w = window as any;
  if (typeof window !== "undefined" && w.__ENV__ && w.__ENV__[key]) {
    return w.__ENV__[key];
  }
  return import.meta.env[key];
};

const GOOGLE_API_SCRIPT = "https://apis.google.com/js/api.js";

let gapiLoadPromise: Promise<void> | null = null;

const loadGoogleApiScript = () => {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser only"));
  if ((window as any).gapi) return Promise.resolve();
  if (!gapiLoadPromise) {
    gapiLoadPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector(`script[src="${GOOGLE_API_SCRIPT}"]`) as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Failed to load Google API script")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = GOOGLE_API_SCRIPT;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google API script"));
      document.head.appendChild(script);
    });
  }
  return gapiLoadPromise;
};

const loadPickerModule = async () => {
  await loadGoogleApiScript();
  const gapi = (window as any).gapi;
  if (!gapi?.load) throw new Error("gapi not available");
  await new Promise<void>((resolve, reject) => {
    gapi.load("picker", {
      callback: () => resolve(),
      onerror: () => reject(new Error("Failed to load Google Picker module")),
    });
  });
};

export const pickGoogleDriveFolder = async (oauthToken: string): Promise<string | null> => {
  const developerKey = getEnv("VITE_GOOGLE_API_KEY");
  if (!developerKey) {
    throw new Error("Missing VITE_GOOGLE_API_KEY");
  }

  await loadPickerModule();
  const google = (window as any).google;
  if (!google?.picker) throw new Error("Google Picker is unavailable");

  return new Promise<string | null>((resolve) => {
    const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(true)
      .setMimeTypes("application/vnd.google-apps.folder");

    const pickerBuilder = new google.picker.PickerBuilder()
      .setOAuthToken(oauthToken)
      .setDeveloperKey(String(developerKey))
      .addView(view)
      .setTitle("Select Drive folder")
      .setCallback((data: any) => {
        if (data.action === google.picker.Action.PICKED && data.docs?.[0]?.id) {
          resolve(String(data.docs[0].id));
          return;
        }
        if (data.action === google.picker.Action.CANCEL) {
          resolve(null);
        }
      });

    const appId = getEnv("VITE_GOOGLE_APP_ID");
    const picker = (appId ? pickerBuilder.setAppId(String(appId)) : pickerBuilder).build();

    picker.setVisible(true);
  });
};
