import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import RoutesProjects from './routes/RoutesProjects';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RoutesProjects />
  </StrictMode>,
)
