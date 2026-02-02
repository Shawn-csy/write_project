import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import LiveEditor from './LiveEditor';
import { useSettings } from '../../contexts/SettingsContext';

// Mock everything!
vi.mock('@uiw/react-codemirror', () => ({
  default: () => <div data-testid="codemirror" />
}));

vi.mock('../../contexts/SettingsContext', () => ({
  useSettings: vi.fn()
}));

vi.mock('../../lib/db', () => ({
  getScript: vi.fn(),
  updateScript: vi.fn()
}));

vi.mock('../../hooks/useEditorSync', () => ({
  useEditorSync: () => ({
    previewRef: { current: null },
    editorViewRef: { current: null },
    setEditorReady: vi.fn(),
    handleEditorScroll: vi.fn(),
    handleViewUpdate: vi.fn(),
  })
}));

describe('LiveEditor', () => {
    beforeEach(() => {
        useSettings.mockReturnValue({
            theme: 'dark',
            markerConfigs: [],
            hiddenMarkerIds: [],
            toggleMarkerVisibility: vi.fn()
        });
    });

    it('should show loading state initially', () => {
        const { container } = render(<LiveEditor scriptId="123" />);
        // Look for the animate-spin class which is on the Loader2 icon
        expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should render the editor and header when data is loaded', () => {
        const initialData = { id: '123', title: 'Test Script', content: 'INT. ROOM - DAY' };
        render(<LiveEditor scriptId="123" initialData={initialData} />);
        
        expect(screen.getByText('Test Script')).toBeInTheDocument();
        expect(screen.getByTestId('codemirror')).toBeInTheDocument();
    });
});
