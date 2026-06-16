import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { DataProvider } from './context/DataContext.jsx'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

// Register AG Grid modules globally
ModuleRegistry.registerModules([AllCommunityModule]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DataProvider>
      <App />
    </DataProvider>
  </StrictMode>,
)
