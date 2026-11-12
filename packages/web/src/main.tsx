import React from 'react';
import { createRoot } from 'react-dom/client';
import './main.css';

const root = document.getElementById('root');

if (!root) throw new Error('Missing root element');

await import('./env.ts');

const { Router } = await import('./Router.tsx');

createRoot(root).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>,
);
