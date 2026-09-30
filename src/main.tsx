import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);


const supportsHaptics =
  /Android/i.test(navigator.userAgent) && typeof navigator.vibrate === 'function';

if (supportsHaptics) {
  document.addEventListener(
    'pointerdown',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest('button');
      if (!button || button.disabled) return;

      navigator.vibrate(10);
    },
    { passive: true },
  );
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        const urlsToCache = [
          window.location.href,
          ...performance
            .getEntriesByType('resource')
            .map((entry) => entry.name)
            .filter((url) => new URL(url).origin === window.location.origin),
        ];

        registration.active?.postMessage({
          type: 'CACHE_URLS',
          urls: Array.from(new Set(urlsToCache)),
        });
      })
      .catch(() => {
        // The app still works as a regular website if service worker registration fails.
      });
  });
}
