import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Не знайдено #root');

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      {/*
        HashRouter, а не BrowserRouter: застосунок живе на GitHub Pages, а той не вміє
        віддавати index.html на довільний шлях. З BrowserRouter перезавантаження
        сторінки /stock/shopping давало б 404.
      */}
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>,
);
