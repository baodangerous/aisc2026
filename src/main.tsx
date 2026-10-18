import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';

declare global {
  interface Window {
    __GM_MAIN_STARTED__?: boolean;
    __GM_APP_MOUNTED__?: boolean;
  }
}

window.__GM_MAIN_STARTED__ = true;

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[GoldenMinutes] Offline shell registration failed', error);
    });
  });
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('GoldenMinutes root element is missing');
}

try {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <RouteErrorBoundary fallbackTitle="GoldenMinutes chưa khởi động được">
        <App />
      </RouteErrorBoundary>
    </React.StrictMode>
  );
  window.__GM_APP_MOUNTED__ = true;
} catch (error) {
  console.error('[GoldenMinutes Boot] React mount failed', error);
  window.__GM_APP_MOUNTED__ = true;
}
