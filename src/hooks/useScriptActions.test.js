import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScriptActions } from './useScriptActions';

// Mock clipboard
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: mockWriteText },
  configurable: true
});

// Mock print helper
vi.mock('../lib/print', () => ({
    buildPrintHtml: vi.fn().mockReturnValue('<html></html>')
}));

describe('useScriptActions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock window.location
        vi.stubGlobal('location', { href: 'http://localhost/test' });
    });

    it('should handle sharing URL', async () => {
        const { result } = renderHook(() => useScriptActions({ titleName: 'Test' }));
        
        await act(async () => {
            await result.current.handleShareUrl();
        });
        
        expect(mockWriteText).toHaveBeenCalledWith('http://localhost/test');
        expect(result.current.shareCopied).toBe(true);
    });

    it('should reset shareCopied after a timeout', async () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useScriptActions({ titleName: 'Test' }));
        
        await act(async () => {
            await result.current.handleShareUrl();
        });
        
        expect(result.current.shareCopied).toBe(true);
        
        act(() => {
            vi.advanceTimersByTime(2000);
        });
        
        expect(result.current.shareCopied).toBe(false);
        vi.useRealTimers();
    });
});
