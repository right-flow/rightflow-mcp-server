import React from 'react';
import ReactDOM from 'react-dom/client';
import { LandingPage } from './pages/LandingPage';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LandingPage />
  </React.StrictMode>,
);
