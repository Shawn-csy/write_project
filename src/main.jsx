import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import './index.css';
import { ThemeProvider } from './components/theme-provider';
import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/toast';
import { I18nProvider } from './contexts/I18nContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <HelmetProvider>
        <ThemeProvider defaultTheme="system" storageKey="screenplay-reader-theme">
          <I18nProvider>
            <AuthProvider>
              <SettingsProvider>
                <ToastProvider>
                  <App />
                </ToastProvider>
              </SettingsProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </HelmetProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
