import React from 'react';
import ReactDOM from 'react-dom/client';
import { Display } from './Display';

const root = document.getElementById('root');

if (!root) {
  console.error('Root element not found. Cannot mount React app.');
  throw new Error('Root element not found');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Display />
  </React.StrictMode>
);
