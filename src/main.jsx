import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/shared/ErrorBoundary';
import './i18n';
import './index.css';
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    <Toaster 
      position="top-right"
      toastOptions={{
        style: {
          background: '#13131a',
          color: '#f1f5f9',
          border: '1px solid #2a2a38'
        }
      }}
    />
  </React.StrictMode>
);
