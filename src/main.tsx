import './styles/design-tokens.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ThemeProvider } from './contexts/ThemeContext'
import { IVAProvider } from './contexts/IVAContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <IVAProvider>
        <App />
      </IVAProvider>
    </ThemeProvider>
  </StrictMode>,
)
