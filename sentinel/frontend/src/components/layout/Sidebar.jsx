import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Upload, 
  ListChecks, 
  TableProperties, 
  ClipboardList, 
  FileBarChart, 
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Upload Center', path: '/upload-center', icon: Upload },
    { name: 'Audit Plan', path: '/audit-plan', icon: ClipboardList },
  ];

  return (
    <div style={{
      width: collapsed ? '64px' : '260px',
      backgroundColor: 'var(--sidebar-dark)',
      color: '#94A3B8',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      transition: 'width var(--transition-normal)',
      borderRight: '1px solid #1E293B',
      flexShrink: 0,
      position: 'relative'
    }}>
      {/* Sidebar Header */}
      <div style={{
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        borderBottom: '1px solid #1E293B',
        gap: '12px',
        overflow: 'hidden',
        whiteSpace: 'nowrap'
      }}>
        <div style={{
          backgroundColor: 'var(--primary-blue)',
          padding: '6px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF'
        }}>
          <ShieldAlert size={20} />
        </div>
        {!collapsed && (
          <span style={{
            fontSize: '16px',
            fontWeight: '700',
            color: '#FFFFFF',
            letterSpacing: '0.5px'
          }}>
            Compli<span style={{ color: 'var(--primary-blue)' }}>Bear</span>
          </span>
        )}
      </div>

      {/* Navigation Links */}
      <div style={{
        flex: 1,
        padding: '16px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        overflowY: 'auto'
      }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: 'var(--border-radius)',
                color: isActive ? '#FFFFFF' : '#94A3B8',
                backgroundColor: isActive ? 'var(--primary-blue)' : 'transparent',
                fontWeight: isActive ? '500' : '400',
                transition: 'all var(--transition-fast)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                overflow: 'hidden'
              })}
              className={({ isActive }) => isActive ? '' : 'sidebar-link-hover'}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              {!collapsed && <span style={{ fontSize: '13px' }}>{item.name}</span>}
            </NavLink>
          );
        })}
      </div>

      {/* Collapse Toggle */}
      <button 
        onClick={() => setCollapsed(!collapsed)}
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '-12px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: 'var(--primary-blue)',
          border: 'none',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10,
          boxShadow: 'var(--shadow-md)'
        }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Add custom CSS hover styling in line */}
      <style>{`
        .sidebar-link-hover:hover {
          background-color: var(--sidebar-dark-hover);
          color: #F1F5F9 !important;
        }
      `}</style>
    </div>
  );
};

export default Sidebar;
