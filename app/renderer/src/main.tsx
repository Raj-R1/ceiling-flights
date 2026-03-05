import React from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import 'maplibre-dist/maplibre-gl.css';
import App from './App';
import { debugLog } from './services/debugLog';
import { mantineTheme } from './theme/mantineTheme';

const GLOBAL_STYLES = `
  html, body, #root {
    margin: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #0a0b0d;
  }

  .maplibregl-map {
    width: 100%;
    height: 100%;
    background: #0a0b0d;
    filter: saturate(1.08) contrast(1.1) brightness(1.05);
  }

  .maplibregl-ctrl-bottom-right,
  .maplibregl-ctrl-bottom-left,
  .maplibregl-ctrl-top-right,
  .maplibregl-ctrl-top-left {
    display: none !important;
  }

  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.28; }
  }
`;

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
    <MantineProvider
      theme={mantineTheme}
      forceColorScheme="dark"
      withCssVariables
      cssVariablesSelector=":root"
    >
      <style>{GLOBAL_STYLES}</style>
      <App />
    </MantineProvider>
  </React.StrictMode>
);
