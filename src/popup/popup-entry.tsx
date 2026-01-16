import React from 'react';
import ReactDOM from 'react-dom/client';
import { Popup } from './Popup';

const root = document.getElementById('root');

if (!root) {
  console.error('Root element not found. Cannot mount React app.');
  throw new Error('Root element not found');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
