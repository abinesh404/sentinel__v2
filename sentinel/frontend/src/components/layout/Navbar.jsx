import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
    localStorage.setItem('theme', theme);
    // Dispatch custom event to notify canvas / chart components
    window.dispatchEvent(new Event('theme-changed'));
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <>
      <style>{`
        .nav-sentinel-brand {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-family: 'Syne', sans-serif;
            font-size: 20px;
            font-weight: 800;
            letter-spacing: 0.16em;
            color: #ff9137;
            text-shadow: 
                0 0 10px rgba(255, 145, 55, 0.45),
                0 0 20px rgba(255, 145, 55, 0.15);
            white-space: nowrap;
        }
        .nav-letter-e {
            display: inline-flex;
            flex-direction: column;
            justify-content: space-between;
            width: 0.52em;
            height: 0.7em;
            padding: 0.09em 0;
            margin: 0 0.04em;
            vertical-align: middle;
            position: relative;
            top: -0.06em;
        }
        .nav-letter-e .bar {
            height: 0.075em;
            background-color: #ff9137;
            box-shadow: 0 0 4px rgba(255, 145, 55, 0.85);
            border-radius: 0.035em;
        }
        .nav-letter-a {
            position: relative;
            width: 0.58em;
            height: 0.7em;
            margin: 0 0.04em;
            display: inline-block;
            vertical-align: middle;
            top: -0.06em;
        }
        .nav-letter-a::before, .nav-letter-a::after {
            content: '';
            position: absolute;
            top: 0;
            width: 0.08em;
            height: 100%;
            background-color: #ff9137;
            box-shadow: 0 0 4px rgba(255, 145, 55, 0.85);
            border-radius: 0.04em;
        }
        .nav-letter-a::before {
            left: 0.22em;
            transform: skewX(-22deg);
            transform-origin: top;
        }
        .nav-letter-a::after {
            right: 0.22em;
            transform: skewX(22deg);
            transform-origin: top;
        }
      `}</style>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        height: '80px',
        backgroundColor: 'var(--navbar-bg)',
        backdropFilter: 'blur(20px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
        borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), inset 0 -1px 0 rgba(99, 102, 241, 0.08)',
        padding: '0 28px',
        width: '100%',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        flexShrink: 0,
      }}>
        {/* Left: Sentinel Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
          <div
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            title="Sentinel Audit Home"
          >
            <img
              src={theme === 'light' ? '/ALTeX_black.png' : '/logo3.png'}
              alt="Sentinel Logo"
              style={{
                height: '56px',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>

        {/* Center: Perfectly Centered Page Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="nav-sentinel-brand">
            <span>S</span>
            <span className="nav-letter-e">
              <span className="bar"></span>
              <span className="bar"></span>
              <span className="bar"></span>
            </span>
            <span>N</span>
            <span>T</span>
            <span>I</span>
            <span>N</span>
            <span className="nav-letter-e">
              <span className="bar"></span>
              <span className="bar"></span>
              <span className="bar"></span>
            </span>
            <span>L</span>
            <span>&nbsp;&nbsp;</span>
            <span className="nav-letter-a"></span>
            <span>I</span>
          </div>
        </div>

        {/* Right: Actions & AJA Labs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '18px' }}>
          {/* Conditional Navigation Button */}
          {currentPath === '/audit-plan' ? (
            <button
              onClick={() => navigate(-1)}
              style={{
                height: '40px',
                padding: '0 20px',
                borderRadius: '30px',
                fontFamily: "'Inter', sans-serif",
                fontSize: '13.5px',
                fontWeight: '700',
                background: 'rgba(30, 41, 72, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.background = 'rgba(40, 55, 95, 0.8)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.background = 'rgba(30, 41, 72, 0.6)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
              }}
            >
              ← Back
            </button>
          ) : currentPath === '/upload-center' ? (
            null
          ) : (
            <button
              onClick={() => navigate('/audit-plan')}
              style={{
                height: '40px',
                padding: '0 22px',
                borderRadius: '30px',
                fontFamily: "'Inter', sans-serif",
                fontSize: '13.5px',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #2dd4bf, #06b6d4)',
                color: '#0f172a',
                border: 'none',
                boxShadow: '0 6px 20px rgba(45, 212, 191, 0.35)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 24px rgba(45, 212, 191, 0.5)';
                e.currentTarget.style.filter = 'brightness(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(45, 212, 191, 0.35)';
                e.currentTarget.style.filter = 'none';
              }}
            >
              Plan Audit
            </button>
          )}

          {/* Theme Toggle Switcher */}
          <button
            onClick={toggleTheme}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme === 'light' ? '#ea580c' : '#fb923c',
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              outline: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.06)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* AJA Labs logo in dark enterprise style */}
          <div style={{ display: 'flex', alignItems: 'center', height: '32px' }}>
            <img
              src={theme === 'light' ? '/ajalabs.png' : '/ajalabs_white.png'}
              alt="AJA Labs Logo"
              style={{
                height: '40px',
                objectFit: 'contain',
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
