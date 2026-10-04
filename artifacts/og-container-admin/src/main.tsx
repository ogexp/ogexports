import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';
import './i18n';

function isBenignDevNoise(message: unknown): boolean {
  if (typeof message !== 'string') return false;
  const m = message.toLowerCase();
  return (
    m.includes('resizeobserver loop') ||
    m.includes('failed_to_load_clerk_js') ||
    m === '(unknown runtime error)'
  );
}

// Suppress known benign dev-only noise that Vite's runtime-error-plugin
// surfaces as a blocking red overlay (Clerk missing key, ResizeObserver
// loops from Radix/cmdk popovers with large lists).
if (import.meta.env.DEV) {
  window.addEventListener('error', (event) => {
    if (isBenignDevNoise(event.message)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message =
      typeof reason?.message === 'string'
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : '';
    if (
      isBenignDevNoise(message) ||
      reason?.code === 'failed_to_load_clerk_js'
    ) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);
