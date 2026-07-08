import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { theme } from './content.js';

// Single source of truth for brand colors/fonts lives in content.js. We push
// those values onto :root as CSS custom properties here so the whole app
// (and plain CSS) can reference var(--color-*) / var(--font-*) without a
// second copy of the palette living in a stylesheet.
const root = document.documentElement;
Object.entries(theme.colors).forEach(([key, value]) => {
  root.style.setProperty(`--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
});
Object.entries(theme.fonts).forEach(([key, value]) => {
  root.style.setProperty(`--font-${key}`, value);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
