import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuditPlanTable from '../components/tables/AuditPlanTable';
import AnimatedBackground from '../components/dashboard/AnimatedBackground';
import { ShieldAlert, Hourglass, Users } from 'lucide-react';

const AuditPlan = () => {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState({ highPriority: 0, effortHours: 0, auditors: 0, processes: [] });
  const [theme, setTheme] = useState(() => document.body.classList.contains('light-mode') ? 'light' : 'dark');

  useEffect(() => {
    const handleThemeChange = () => {
      setTheme(document.body.classList.contains('light-mode') ? 'light' : 'dark');
    };
    window.addEventListener('theme-changed', handleThemeChange);
    return () => window.removeEventListener('theme-changed', handleThemeChange);
  }, []);

  const handleKpiUpdate = useCallback((values) => {
    setKpis(values);
  }, []);

  const themeTealOrOrange = theme === 'light' ? '#ea580c' : '#2dd4bf';

  return (
    <div className="main-content" style={{ position: 'relative' }}>
      {/* Animated 3D Background */}
      <AnimatedBackground />

      {/* Page Header — cinematic dark premium style */}
      <div style={{
        margin: '24px 24px 0 24px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '18px',
        position: 'relative',
        zIndex: 1,
        paddingBottom: '20px',
        borderBottom: '2px solid rgba(148, 163, 184, 0.08)',
      }}>
        {/* Orange Diamond Shield Icon */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #ff8a00, #ff6a00)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(255, 138, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
          flexShrink: 0,
        }}>
          <ShieldAlert size={28} style={{ color: '#ffffff' }} />
        </div>

        {/* Title and Subtitle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '900',
            color: 'var(--text-primary)',
            letterSpacing: '-0.5px',
            margin: 0,
            textShadow: '0 2px 10px rgba(0,0,0,0.1)',
            fontFamily: "'Syne', sans-serif"
          }}>
            Sentinel <span>Strategic Audit Plan</span>
          </h1>
          <p style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            fontWeight: '500',
            margin: 0,
            letterSpacing: '0.2px',
          }}>
            Initialize resource allocation, timeline estimations, and control verification plan.
          </p>
        </div>

        {/* SENTINEL AI Watermark on right */}
        <div style={{
          position: 'absolute',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '52px',
          fontWeight: '900',
          letterSpacing: '6px',
          color: 'rgba(255, 145, 55, 0.06)',
          fontFamily: "'Syne', sans-serif",
          whiteSpace: 'nowrap',
          userSelect: 'none',
          pointerEvents: 'none',
        }}>
          SENTINEL AI
        </div>
      </div>

      {/* Main Content Area */}
      <div className="scrollable-container dashboard-safe-area" style={{
        padding: '0 24px 24px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* 3 KPI Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px',
          marginTop: '20px',
        }}>

          {/* Card 1 — High-Priority Focus Areas */}
          <div style={{
            background: 'var(--surface)',
            backdropFilter: 'blur(14px) saturate(1.3)',
            WebkitBackdropFilter: 'blur(14px) saturate(1.3)',
            border: '1px solid var(--border)',
            borderRadius: '18px',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Top accent line */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
              background: 'linear-gradient(90deg, transparent, var(--kpi-accent-glow) 30%, var(--kpi-accent-color) 50%, var(--kpi-accent-glow) 70%, transparent)',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={16} style={{ color: '#f87171' }} />
              <span style={{
                fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
                letterSpacing: '0.8px', color: 'var(--kpi-accent-color)',
              }}>
                High-Priority Focus Areas
              </span>
            </div>
            <ul style={{
              margin: 0, paddingLeft: '18px', fontSize: '13px',
              color: 'var(--text-primary)', lineHeight: '1.8', fontWeight: '500',
            }}>
              {kpis.processes && kpis.processes.length > 0 ? (
                kpis.processes.map((proc, index) => (
                  <li key={index} style={{ color: 'var(--text-secondary)' }}>{proc}</li>
                ))
              ) : (
                <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No processes loaded.</span>
              )}
            </ul>
          </div>

          {/* Card 2 — Total Recommended Effort */}
          <div style={{
            background: 'var(--surface)',
            backdropFilter: 'blur(14px) saturate(1.3)',
            WebkitBackdropFilter: 'blur(14px) saturate(1.3)',
            border: '1px solid var(--border)',
            borderRadius: '18px',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Top accent line */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
              background: 'linear-gradient(90deg, transparent, var(--kpi-accent-glow) 30%, var(--kpi-accent-color) 50%, var(--kpi-accent-glow) 70%, transparent)',
            }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Hourglass size={16} style={{ color: '#fbbf24' }} />
                <span style={{
                  fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
                  letterSpacing: '0.8px', color: 'var(--kpi-accent-color)',
                }}>
                  Total Recommended Effort
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <div style={{
                  fontSize: '42px', fontWeight: '800', color: 'var(--kpi-accent-color)',
                  margin: '6px 0 2px', lineHeight: 1,
                  textShadow: '0 0 30px var(--kpi-accent-glow)',
                }}>
                  {kpis.effortHours}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>Hours</div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                  <span style={{ color: theme === 'light' ? '#000000' : '#94a3b8' }}>Hours per Auditor:</span> <strong style={{ color: 'var(--kpi-duration-color)' }}>{kpis.auditors ? Math.round(kpis.effortHours / kpis.auditors) : 0} Hours</strong>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                  <span style={{ color: theme === 'light' ? '#000000' : '#94a3b8' }}>Estimated Duration:</span> <strong style={{ color: 'var(--kpi-duration-color)' }}>{Math.ceil(kpis.effortHours / 8)} Days</strong>
                </div>
              </div>
            </div>
            {/* People Silhouette SVG */}
            <svg width="80" height="60" viewBox="0 0 80 60" fill="none" style={{ opacity: 0.5, flexShrink: 0 }}>
              <circle cx="30" cy="16" r="8" fill="var(--kpi-accent-color)" opacity="0.4" />
              <path d="M18 52c0-8 5-14 12-14s12 6 12 14" stroke="var(--kpi-accent-color)" strokeWidth="2" fill="none" opacity="0.3" />
              <circle cx="55" cy="20" r="6" fill="var(--kpi-accent-color)" opacity="0.3" />
              <path d="M46 52c0-6 4-11 9-11s9 5 9 11" stroke="var(--kpi-accent-color)" strokeWidth="1.5" fill="none" opacity="0.25" />
              <circle cx="20" cy="24" r="5" fill="var(--kpi-accent-color)" opacity="0.2" />
              <path d="M12 52c0-5 3.5-9 8-9s8 4 8 9" stroke="var(--kpi-accent-color)" strokeWidth="1.5" fill="none" opacity="0.2" />
            </svg>
          </div>

          {/* Card 3 — Total Auditors Recommended */}
          <div style={{
            background: 'var(--surface)',
            backdropFilter: 'blur(14px) saturate(1.3)',
            WebkitBackdropFilter: 'blur(14px) saturate(1.3)',
            border: '1px solid var(--border)',
            borderRadius: '18px',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Top accent line */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
              background: 'linear-gradient(90deg, transparent, var(--kpi-accent-glow) 30%, var(--kpi-accent-color) 50%, var(--kpi-accent-glow) 70%, transparent)',
            }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} style={{ color: 'var(--kpi-accent-color)' }} />
                <span style={{
                  fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
                  letterSpacing: '0.8px', color: 'var(--kpi-accent-color)',
                }}>
                  Total Auditors Recommended
                </span>
              </div>
              <div style={{
                fontSize: '42px', fontWeight: '800', color: 'var(--kpi-accent-color)',
                margin: '6px 0 2px', lineHeight: 1,
                textShadow: '0 0 30px var(--kpi-accent-glow)',
              }}>
                {kpis.auditors}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>Auditors (Concurrent)</div>
            </div>
            {/* People Silhouette SVG */}
            <svg width="90" height="65" viewBox="0 0 90 65" fill="none" style={{ opacity: 0.5, flexShrink: 0 }}>
              <circle cx="32" cy="14" r="8" fill="var(--kpi-accent-color)" opacity="0.4" />
              <path d="M20 55c0-9 5.5-15 12-15s12 6 12 15" stroke="var(--kpi-accent-color)" strokeWidth="2" fill="none" opacity="0.3" />
              <circle cx="58" cy="18" r="7" fill="var(--kpi-accent-color)" opacity="0.35" />
              <path d="M48 55c0-7 4.5-12 10-12s10 5 10 12" stroke="var(--kpi-accent-color)" strokeWidth="1.8" fill="none" opacity="0.28" />
              <circle cx="78" cy="22" r="5" fill="var(--kpi-accent-color)" opacity="0.2" />
              <path d="M71 55c0-5 3-8 7-8s7 3 7 8" stroke="var(--kpi-accent-color)" strokeWidth="1.5" fill="none" opacity="0.2" />
            </svg>
          </div>
        </div>

        {/* Main Editable Plan Table */}
        <AuditPlanTable onKpiUpdate={handleKpiUpdate} />

      </div>
    </div>
  );
};

export default AuditPlan;
