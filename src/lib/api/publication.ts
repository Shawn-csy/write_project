import { fetchApi } from './client';
export interface PublicationStatus {
  scope: 'site';
  status: 'unknown' | 'pending' | 'running' | 'complete' | 'failed';
  updatedAt: string | null;
  completedAt: string | null;
  checkedAt: string | null;
  stale: boolean;
  itemInclusion: 'unknown';
}
export const getPublicationStatus = () => fetchApi('/admin/publication-status', { noCache: true }) as Promise<PublicationStatus>;
