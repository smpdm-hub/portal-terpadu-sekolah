import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// 💡 Import AppProvider agar seluruh komponen aplikasi terjangkau oleh Context
import { AppProvider } from './context/AppContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Bungkus komponen App di dalam AppProvider */}
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>,
)
