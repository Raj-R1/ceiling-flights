import React from 'react';
import { createRoot } from 'react-dom/client';
import 'maplibre-dist/maplibre-gl.css';
import App from './App';
import './styles.css';
import { debugLog } from './services/debugLog';

// Capture top-level errors to keep debugging possible in packaged builds.
window.addEventListener('error', (event) => {
  debugLog('runtime', 'Unhandled window error', {
    message: event.message,
    source: event.filename,
    line: event.lineno,
    column: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
  debugLog('runtime', 'Unhandled promise rejection', { reason });
});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
