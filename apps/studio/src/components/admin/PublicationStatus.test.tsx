import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { PublicationStatus as StatusView } from './PublicationStatus';
const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../lib/api/publication', () => ({ getPublicationStatus: api.get }));
import { publicationLabel } from './PublicationStatus';
import type { PublicationStatus } from '../../lib/api/publication';
const base: PublicationStatus = { scope: 'site', status: 'unknown', updatedAt: null, completedAt: null, checkedAt: null, stale: false, itemInclusion: 'unknown' };
describe('publication status labels', () => {
  it('does not claim an individual save is published', () => {
    expect(publicationLabel({ ...base, status: 'complete' })).toBe('上次發布已驗證');
    expect(publicationLabel(null)).toBe('狀態未知');
  });
  it('shows waiting, failure and stalled execution distinctly', () => {
    expect(publicationLabel({ ...base, status: 'pending' })).toBe('等待下次發布');
    expect(publicationLabel({ ...base, status: 'failed' })).toBe('發布失敗');
    expect(publicationLabel({ ...base, status: 'running', stale: true })).toBe('執行逾時，請檢查');
  });
});

describe('publication panel', () => {
  it('shows historical completion with explicit waiting and unknown inclusion', async () => {
    api.get.mockResolvedValue({ ...base, status: 'complete', completedAt: '2026-01-01T00:00:00Z' });
    render(<StatusView />);
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('上次發布已驗證'));
    expect(screen.getByText(/新修改等待發布/)).toBeTruthy();
    expect(screen.getByText(/發布驗證：/)).toBeTruthy();
    cleanup();
  });
  it('returns unknown on API failure without exposing error', async () => {
    api.get.mockRejectedValue(new Error('/host/secret'));
    render(<StatusView />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(screen.getByRole('status').textContent).toContain('狀態未知');
    expect(screen.queryByText(/host\/secret/)).toBeNull();
    cleanup();
  });
});
