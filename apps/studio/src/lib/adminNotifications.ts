export const ADMIN_QUEUE_UPDATED_EVENT = "admin:queue-updated";

export function notifyAdminQueueUpdated(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(ADMIN_QUEUE_UPDATED_EVENT));
}
