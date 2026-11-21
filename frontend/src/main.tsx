import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './shared/styles/design-tokens.css';
import './shared/styles/tokens.css';
import './features/identity/styles/identity.css';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found in HTML document');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
