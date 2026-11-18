import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// URL normalization for HashRouter: redirect pathname-based /activate to hash-based /#/activate
if (typeof window !== 'undefined') {
  const pathname = window.location.pathname;
  if (pathname.includes('/activate') || pathname.includes('/activation')) {
    const search = window.location.search || '';
    window.location.replace(`/#/activate${search}`);
  }
}


/* 
// Register PWA Service Worker (DISABLED TO PREVENT OFFLINE MODE ISSUES)
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline')
  },
})
*/

const renderApp = () => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

const loadConfig = async () => {
  try {
    const res = await fetch('/config.json')
    if (res.ok) {
      const cfg = await res.json()
      if (typeof window !== 'undefined') {
        window.__APP_CONFIG__ = cfg
      }
    }
  } catch (e) {
    console.error('Failed to load config.json', e)
  }
}

// Load config first, then render the app
loadConfig().finally(() => {
  renderApp()
})
