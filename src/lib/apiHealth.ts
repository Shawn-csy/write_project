const OFFLINE_COOLDOWN_MS = 30000;

let offlineUntil = 0;
let lastLogAt = 0;

export const isApiOffline = () => Date.now() < offlineUntil;

export const markApiOffline = (error, source = "api") => {
  offlineUntil = Date.now() + OFFLINE_COOLDOWN_MS;
  const now = Date.now();
  if (now - lastLogAt > 5000) {
    console.warn(`[${source}] API unreachable; entering cooldown (${OFFLINE_COOLDOWN_MS}ms).`, error);
    lastLogAt = now;
  }
};

export const clearApiOffline = () => {
  offlineUntil = 0;
};
