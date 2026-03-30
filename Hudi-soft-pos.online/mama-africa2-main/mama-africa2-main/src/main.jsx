import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'


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
