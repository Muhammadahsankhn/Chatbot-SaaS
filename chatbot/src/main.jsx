import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* ThemeProvider must be outermost so dark class applies to entire document */}
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)