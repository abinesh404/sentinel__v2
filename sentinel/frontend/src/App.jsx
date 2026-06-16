import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';

// Page imports
import Dashboard from './pages/Dashboard';
import UploadCenter from './pages/UploadCenter';
import AuditPlan from './pages/AuditPlan';


function App() {
  return (
    <BrowserRouter>
      <div className="layout-wrapper">
        {/* Primary Top Header */}
        <Navbar />

        {/* Main Content Viewport */}
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/upload-center" element={<UploadCenter />} />
            <Route path="/audit-plan" element={<AuditPlan />} />
            <Route path="/audit-plan/*" element={<Navigate to="/audit-plan" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
