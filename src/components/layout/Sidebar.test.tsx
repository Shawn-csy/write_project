import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Sidebar from './Sidebar';
import { MemoryRouter, useLocation } from 'react-router-dom';

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

vi.mock("../../contexts/I18nContext", () => ({
  useI18n: () => ({
    t: (key) => ({
      "app.settings": "設定",
      "app.about": "關於",
      "nav.works": "作品",
      "nav.series": "系列",
      "nav.identity": "公開身份",
      "nav.mediaLibrary": "媒體庫",
      "nav.adminConsole": "超管後台",
      "sidebar.adminSection": "管理",
      "nav.gallery": "公開台本",
      "sidebar.backHome": "回首頁",
      "sidebar.collapseList": "收合列表",
      "sidebar.expandList": "展開列表",
      "sidebar.publicSection": "公開",
      "sidebar.menuSection": "選單",
    })[key] ?? key,
  }),
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

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

describe('Sidebar Component', () => {
  const mockProps = {
    openAbout: vi.fn(),
    closeOverlays: vi.fn(),
    setSidebarOpen: vi.fn(),
    className: ''
  };

  it('renders the work-centred navigation', () => {
    render(
      <MemoryRouter initialEntries={['/works']}>
        <Sidebar {...mockProps} />
      </MemoryRouter>
    );

    for (const label of ['作品', '系列', '公開身份', '媒體庫', '設定', '關於', '公開台本']) {
      expect(screen.getByText(label)).toBeDefined();
    }
    expect(screen.getByRole('button', { name: '作品' }).getAttribute('aria-current')).toBe('page');
    expect(screen.queryByText('移轉管理')).toBeNull();
    expect(screen.queryByText('超管後台')).toBeNull();
  });

  it('shows the admin console entry only for admins', () => {
    render(
      <MemoryRouter>
        <Sidebar {...mockProps} isAdmin />
      </MemoryRouter>
    );
    expect(screen.getByText('超管後台')).toBeDefined();
  });

  it('clicking Settings closes overlays and opens the settings page', () => {
    render(
      <MemoryRouter initialEntries={['/works']}>
        <Sidebar {...mockProps} />
        <LocationProbe />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('設定'));
    expect(mockProps.closeOverlays).toHaveBeenCalled();
    expect(screen.getByTestId('location').textContent).toBe('/settings');
  });

  it('media library opens the media tab of settings', () => {
    render(
      <MemoryRouter initialEntries={['/works']}>
        <Sidebar {...mockProps} />
        <LocationProbe />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('媒體庫'));
    expect(screen.getByTestId('location').textContent).toBe('/settings?tab=media');
  });

  it('clicking About in footer calls openAbout', () => {
    render(
      <MemoryRouter>
        <Sidebar {...mockProps} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('關於'));
    expect(mockProps.openAbout).toHaveBeenCalled();
  });

  it('renders icon rail when collapsed and keeps actions accessible', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar {...mockProps} collapsed />
      </MemoryRouter>
    );

    expect(screen.queryByText('作品')).toBeNull();
    expect(screen.getByLabelText('作品')).toBeDefined();
    expect(screen.getByLabelText('系列')).toBeDefined();
  });
});
