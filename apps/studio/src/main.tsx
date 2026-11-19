import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import App from './App';
import './index.css';
import { ThemeProvider } from './components/theme-provider';
import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/toast';
import { I18nProvider } from './contexts/I18nContext';

const staticFooter = document.getElementById('static-footer');
if (staticFooter) staticFooter.style.display = 'none';

function RouteAwareSettingsProvider({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const loadMarkerDefaults = pathname.startsWith('/edit/')
    || pathname.startsWith('/read/')
    || pathname.startsWith('/settings');
  return <SettingsProvider loadMarkerDefaults={loadMarkerDefaults}>{children}</SettingsProvider>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider defaultTheme="system" storageKey="screenplay-reader-theme">
        <I18nProvider>
          <AuthProvider>
            <RouteAwareSettingsProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </RouteAwareSettingsProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
