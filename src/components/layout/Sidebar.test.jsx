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
    Info: () => <div data-testid="icon-info" />,
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

  it('renders menu with 媒體庫 at the same level as 工作室, and hides 移轉管理 from sidebar', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar {...mockProps} />
      </MemoryRouter>
    );

    expect(screen.getByText('設定')).toBeDefined();
    expect(screen.getByText('關於')).toBeDefined();
    expect(screen.getByText('閱讀與寫作')).toBeDefined();
    expect(screen.getByText('工作室')).toBeDefined();
    expect(screen.getByText('媒體庫')).toBeDefined();
    expect(screen.queryByText('移轉管理')).toBeNull();
  });

  it('clicking Settings in footer calls openSettings', () => {
    render(
      <MemoryRouter>
        <Sidebar {...mockProps} />
      </MemoryRouter>
    );

    const settingsBtn = screen.getByText('設定');
    fireEvent.click(settingsBtn);
    expect(mockProps.openSettings).toHaveBeenCalled();
  });

  it('clicking About in footer calls openAbout', () => {
    render(
      <MemoryRouter>
        <Sidebar {...mockProps} />
      </MemoryRouter>
    );

    const aboutBtn = screen.getByText('關於');
    fireEvent.click(aboutBtn);
    expect(mockProps.openAbout).toHaveBeenCalled();
  });
});
