import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'

// GitHub Pages serves the SPA under the repository sub-path; keep in sync
// with `base` in vite.config.ts and SITE_BASE_URL in src/lib/seo.ts.
const routerBasename = import.meta.env.BASE_URL

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Missing #root element')
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
