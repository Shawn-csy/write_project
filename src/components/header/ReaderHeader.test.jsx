import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ReaderHeader from './ReaderHeader';

// Mock Dependencies
vi.mock("../ui/card", () => ({
    Card: ({ children, className }) => <div className={className} data-testid="card">{children}</div>,
    CardContent: ({ children, className }) => <div className={className} data-testid="card-content">{children}</div>
}));

vi.mock("../reader/ReaderControls", () => ({
    ReaderControls: () => <div data-testid="reader-controls" />
}));

vi.mock("../reader/ReaderActions", () => ({
    ReaderActions: () => <div data-testid="reader-actions" />
}));

vi.mock("../../contexts/SettingsContext", () => ({
    useSettings: () => ({
        hiddenMarkerIds: [],
        toggleMarkerVisibility: vi.fn()
    })
}));

vi.mock("../../hooks/useEditableTitle", () => ({
    useEditableTitle: () => ({
        isEditing: false,
        editTitle: "",
        setEditTitle: vi.fn(),
        startEditing: vi.fn(),
        submitTitle: vi.fn()
    })
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('ReaderHeader', () => {
    it('renders without crashing', () => {
        render(
            <ReaderHeader 
                titleName="Test Script"
                onBack={vi.fn()}
            />
        );
        expect(screen.getByText("Test Script")).toBeDefined();
        // Check for back button (via HeaderTitleBlock rendering) - it uses ARIA label
        expect(screen.getByLabelText("返回")).toBeDefined();
    });
});
