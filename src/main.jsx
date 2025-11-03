// main.jsx or index.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import "./index.css"

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />   {/* App must NOT contain another BrowserRouter */}
    </BrowserRouter>
  </React.StrictMode>
)
