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
    activeFile: null,
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
        <Sidebar {...mockProps} activeFile={null} />
      </MemoryRouter>
    );

    // Should see Gallery and Studio
    expect(screen.getByText('公開台本 (Gallery)')).toBeDefined();
    expect(screen.getByText('工作室 (Studio)')).toBeDefined();
    
    // Should NOT see Scene Outline
    expect(screen.queryByText('Scene Outline')).toBeNull();
  });

  it('renders Scene List when active file is present', () => {
    const sceneProps = {
      ...mockProps,
      activeFile: { id: '1', name: 'Script' },
      sceneList: [
        { id: 's1', label: 'Scene 1' },
        { id: 's2', label: 'Scene 2' }
      ]
    };

    render(
      <MemoryRouter>
        <Sidebar {...sceneProps} />
      </MemoryRouter>
    );

    expect(screen.getByText('Scene Outline')).toBeDefined();
    expect(screen.getByText('Scene 1')).toBeDefined();
    expect(screen.getByText('Scene 2')).toBeDefined();
    
    // Navigation Menu should be hidden
    expect(screen.queryByText('公開台本 (Gallery)')).toBeNull();
  });

  it('calls onSelectScene when a scene is clicked', () => {
    const onSelectScene = vi.fn();
    const sceneProps = {
      ...mockProps,
      activeFile: { id: '1' },
      sceneList: [{ id: 's1', label: 'Scene 1' }],
      onSelectScene
    };

    render(
      <MemoryRouter>
        <Sidebar {...sceneProps} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Scene 1'));
    expect(onSelectScene).toHaveBeenCalledWith('s1');
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
