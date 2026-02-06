import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Sidebar from './Sidebar';
import { MemoryRouter } from 'react-router-dom';

// Mock Lucide icons to avoid SVGs
vi.mock("lucide-react", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    PanelLeftClose: () => <div data-testid="icon-close" />,
    Settings: () => <div data-testid="icon-settings" />,
    AlignLeft: () => <div data-testid="icon-align-left" />,
    Home: () => <div data-testid="icon-home" />,
    Info: () => <div data-testid="icon-info" />,
    LayoutTemplate: () => <div data-testid="icon-layout" />,
    ChevronLeft: () => <div data-testid="icon-chevron-left" />,
    Library: () => <div data-testid="icon-library" />,
  };
});

// Mock UserMenu as it depends on AuthContext
vi.mock("../auth/UserMenu", () => ({
  default: () => <div data-testid="user-menu">User Menu</div>
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

describe('Sidebar Component', () => {
  const mockProps = {
    sceneList: [],
    currentSceneId: null,
    onSelectScene: vi.fn(),
    openAbout: vi.fn(),
    openSettings: vi.fn(),
    closeAbout: vi.fn(),
    setSidebarOpen: vi.fn(),
    openHome: vi.fn(),
    accentStyle: { label: 'text-red-500' },
    className: ''
  };

  it('renders Navigation Menu when no active file', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar {...mockProps} />
      </MemoryRouter>
    );

    // Should see primary nav items
    expect(screen.getByText('公開台本 (Gallery)')).toBeDefined();
    expect(screen.getByText('工作室 (Studio)')).toBeDefined();
    expect(screen.getByText('閱讀與寫作 (Workspace)')).toBeDefined();
    expect(screen.getByText('超級管理員')).toBeDefined();
  });

  it('clicking Settings in footer calls openSettings', () => {
    render(
      <MemoryRouter>
        <Sidebar {...mockProps} />
      </MemoryRouter>
    );

    const settingsBtn = screen.getByText('設定 (Settings)');
    fireEvent.click(settingsBtn);
    expect(mockProps.openSettings).toHaveBeenCalled();
  });
});
