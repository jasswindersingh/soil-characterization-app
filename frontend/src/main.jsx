import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { LanguageProvider } from './LanguageContext' // Import the provider
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Wrap App in LanguageProvider */}
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>,
)