let exportWorker = null;
let nextTaskId = 1;
const pendingTasks = new Map();

const ensureWorker = () => {
  if (typeof Worker === "undefined") {
    throw new Error("Worker is not supported in this environment.");
  }
  if (!exportWorker) {
    exportWorker = new Worker(new URL("./scriptExportWorker.js", import.meta.url), { type: "module" });
    exportWorker.onmessage = (event) => {
      const { id, ok, result, error } = event.data || {};
      if (!id || !pendingTasks.has(id)) return;
      const { resolve, reject } = pendingTasks.get(id);
      pendingTasks.delete(id);
      if (ok) resolve(result);
      else reject(new Error(error || "Worker task failed."));
    };
    exportWorker.onerror = (event) => {
      const message = event?.message || "Worker crashed.";
      pendingTasks.forEach(({ reject }) => reject(new Error(message)));
      pendingTasks.clear();
      exportWorker?.terminate();
      exportWorker = null;
    };
  }
  return exportWorker;
};

export const runExportWorkerTask = (type, payload) => {
  const worker = ensureWorker();
  const id = nextTaskId++;
  return new Promise((resolve, reject) => {
    pendingTasks.set(id, { resolve, reject });
    worker.postMessage({ id, type, payload });
  });
};

