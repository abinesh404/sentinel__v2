import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const DetailedGapAnalysis = ({ onClose }) => {
  const { appData } = useData();
  const { rows = [], columnMap = {} } = appData;

  // Theme state listener
  const [theme, setTheme] = useState(() => document.body.classList.contains('light-mode') ? 'light' : 'dark');
  useEffect(() => {
    const handleThemeChange = () => {
      setTheme(document.body.classList.contains('light-mode') ? 'light' : 'dark');
    };
    window.addEventListener('theme-changed', handleThemeChange);
    return () => window.removeEventListener('theme-changed', handleThemeChange);
  }, []);

  // Helper function to extract properties safely
  const getVal = (item, logicalKey) => {
    if (!item) return '';
    if (columnMap && columnMap[logicalKey] && item[columnMap[logicalKey]] !== undefined) {
      return String(item[columnMap[logicalKey]] || '').trim();
    }
    const synonyms = {
      process: ['process', 'Process'],
      control_ref: ['controlRefNo', 'control_ref', 'Control Ref No', 'Control Ref No.', 'Control ref no', 'id'],
      risk_desc: ['riskDescription', 'risk_description', 'Risk Description', 'riskDescription', 'Risk', 'risk'],
      control_desc: ['controlDescription', 'control_desc', 'Control Description', 'controlDescription', 'Control', 'control'],
      control_type: ['controlType', 'control_type', 'Control Type', 'Control type', 'classification', 'controlClassification'],
      control_nature: ['controlNature', 'control_nature', 'Control Nature', 'Control nature'],
      gaps: ['gapsNoted', 'gaps', 'Gaps Noted (if any)', 'gaps_noted', 'Gaps Noted', 'Gaps noted']
    };
    const keys = synonyms[logicalKey] || [logicalKey];
    for (const k of keys) {
      if (item[k] !== undefined) {
        return String(item[k] || '').trim();
      }
    }
    return '';
  };

  // Determine detected industry info for badge
  const detectedIndustryName = useMemo(() => {
    let hasMfg = false;
    let hasFin = false;
    rows.forEach(r => {
      const text = `${getVal(r, 'process')} ${getVal(r, 'risk_desc')}`.toLowerCase();
      if (text.match(/scrap|warehouse|quality|inventory|material|manufactur|qa/)) hasMfg = true;
      if (text.match(/payment|invoice|bank|treasury|cash|finance|reconcil|ledger|sox/)) hasFin = true;
    });
    if (hasMfg) return 'Manufacturing';
    if (hasFin) return 'Financial Services';
    return 'General Enterprise';
  }, [rows]);

  // Dropdown States
  const [scope, setScope] = useState('global');
  const [region, setRegion] = useState('North America');
  const [industry, setIndustry] = useState('Manufacturing');

  // Benchmark API State
  const [benchmarks, setBenchmarks] = useState({ leftChart: [], rightChart: [] });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch benchmark data from API
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetch(`/api/gap-analysis/benchmarks?scope=${scope}&region=${encodeURIComponent(region)}&industry=${encodeURIComponent(industry)}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success) {
          setBenchmarks({
            leftChart: data.leftChart || [],
            rightChart: data.rightChart || []
          });
        }
      })
      .catch(err => console.error("Error fetching benchmarks:", err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [scope, region, industry]);

  // Horizontal bar options
  const horizontalBarOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : '#0F172A',
        titleColor: theme === 'light' ? '#0f172a' : '#ffffff',
        bodyColor: theme === 'light' ? '#0f172a' : '#ffffff',
        titleFont: { family: 'Inter', size: 11, weight: 'bold' },
        bodyFont: { family: 'Inter', size: 11 },
        padding: 8,
        cornerRadius: 4,
        borderColor: theme === 'light' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
        borderWidth: 1,
        callbacks: {
          title: (tooltipItems) => tooltipItems[0].label,
          label: (ctx) => ` ${ctx.parsed.x}%`
        }
      }
    },
    scales: {
      x: {
        grid: { color: theme === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.06)' },
        ticks: { 
          font: { family: 'Inter', size: 10 }, 
          color: theme === 'light' ? '#0f172a' : '#ffffff',
          callback: (value) => `${value}%`
        },
        max: 100
      },
      y: {
        grid: { display: false },
        ticks: { 
          font: { family: 'Inter', size: 10 }, 
          color: theme === 'light' ? '#0f172a' : '#ffffff',
          callback: function(value) {
            const label = this.getLabelForValue(value);
            if (label && label.length > 25) {
              return label.slice(0, 25) + '...';
            }
            return label;
          }
        }
      }
    }
  };

  return (
    <div style={{
      marginTop: '24px',
      background: 'var(--detailed-gap-bg, linear-gradient(145deg, #03071d, #040b2d 55%, #020617))',
      border: '1px solid var(--border)',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: '26px',
      padding: '28px',
      animation: 'fadeIn 0.3s ease',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* ── SECTION TITLE & INDUSTRY BADGE ── */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        borderBottom: '1px solid var(--border)', 
        paddingBottom: '12px', 
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: '700', 
            color: 'var(--text-primary)', 
            margin: 0,
            letterSpacing: '-0.5px',
            fontFamily: "'Inter', sans-serif"
          }}>
            Detailed Control Gap Analysis
          </h2>
          <div style={{ width: '40px', height: '3px', backgroundColor: '#818cf8', borderRadius: '2px', marginTop: '2px' }}></div>
        </div>
        <span style={{
          fontSize: '11px',
          fontWeight: '700',
          color: '#2dd4bf',
          backgroundColor: 'rgba(45, 212, 191, 0.12)',
          padding: '4px 12px',
          borderRadius: '999px',
          border: '1px solid rgba(45, 212, 191, 0.25)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Industry: {detectedIndustryName}
        </span>
      </div>

      {/* ── CLEAN DROPDOWN FILTERS ── */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Scope Type</label>
          <select
            value={scope}
            onChange={(e) => {
              const newScope = e.target.value;
              setScope(newScope);
              if (newScope === 'industry') {
                setIndustry('Manufacturing');
              }
            }}
            style={{
              backgroundColor: 'var(--surface-muted)',
              border: '1px solid var(--border)',
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '12.5px',
              color: 'var(--text-primary)',
              outline: 'none',
              minWidth: '120px',
              cursor: 'pointer'
            }}
          >
            <option value="global">Global</option>
            <option value="regional">Regional</option>
            <option value="industry">Industry</option>
          </select>
        </div>

        {scope === 'regional' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              style={{
                backgroundColor: 'var(--surface-muted)',
                border: '1px solid var(--border)',
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '12.5px',
                color: 'var(--text-primary)',
                outline: 'none',
                minWidth: '140px',
                cursor: 'pointer'
              }}
            >
              <option value="Africa">Africa</option>
              <option value="Asia Pacific">Asia Pacific</option>
              <option value="Europe">Europe</option>
              <option value="Latin America">Latin America</option>
              <option value="Middle East">Middle East</option>
              <option value="North America">North America</option>
            </select>
          </div>
        )}

        {scope === 'industry' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Industry</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              style={{
                backgroundColor: 'var(--surface-muted)',
                border: '1px solid var(--border)',
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '12.5px',
                color: 'var(--text-primary)',
                outline: 'none',
                minWidth: '200px',
                cursor: 'pointer'
              }}
            >
              <option value="Financial Services">Financial Services</option>
              <option value="Government">Government</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Mining/Energy">Mining/Energy</option>
              <option value="Agriculture">Agriculture</option>
              <option value="Wholesale/Retail">Wholesale/Retail</option>
              <option value="Administrative Support">Administrative Support</option>
              <option value="Technology">Technology</option>
              <option value="Education">Education</option>
              <option value="Transportation">Transportation</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Construction">Construction</option>
              <option value="Information/Communication">Information/Communication</option>
              <option value="Real Estate">Real Estate</option>
            </select>
          </div>
        )}
      </div>

      {/* ── CHART SECTION WITH LOADING STATE ── */}
      {isLoading ? (
        <div style={{
          height: '280px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'var(--text-secondary)',
          fontSize: '13px',
          backgroundColor: 'var(--surface-muted)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          boxShadow: 'none',
          marginBottom: '24px'
        }}>
          Loading benchmark analytics...
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '20px', 
          marginBottom: '24px' 
        }}>
          {/* Left Chart Card */}
          <div style={{ 
            background: 'var(--surface-muted)', 
            border: '1px solid var(--border)', 
            borderRadius: '18px', 
            padding: '20px', 
            height: '280px', 
            boxShadow: '0 8px 30px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ fontWeight: '700', fontSize: '12px', color: 'var(--text-primary)', marginBottom: '12px' }}>
              Top Risks Analysis ({scope.toUpperCase() === 'GLOBAL' ? 'Global Average' : scope.toUpperCase() === 'REGIONAL' ? region : industry})
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              {benchmarks.leftChart.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '11px' }}>
                  No risk data available
                </div>
              ) : (
                <Bar 
                  data={{
                    labels: benchmarks.leftChart.map(x => x.name),
                    datasets: [{
                      data: benchmarks.leftChart.map(x => x.value),
                      backgroundColor: '#3B82F6',
                      borderRadius: 8,
                      barThickness: 10
                    }]
                  }}
                  options={horizontalBarOptions}
                />
              )}
            </div>
          </div>

          {/* Right Chart Card */}
          <div style={{ 
            background: 'var(--surface-muted)', 
            border: '1px solid var(--border)', 
            borderRadius: '18px', 
            padding: '20px', 
            height: '280px', 
            boxShadow: '0 8px 30px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ fontWeight: '700', fontSize: '12px', color: 'var(--text-primary)', marginBottom: '12px' }}>
              Top Fraud Schemes by Cases ({industry})
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              {benchmarks.rightChart.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '11px' }}>
                  No fraud data available
                </div>
              ) : (
                <Bar 
                  data={{
                    labels: benchmarks.rightChart.map(x => x.name),
                    datasets: [{
                      data: benchmarks.rightChart.map(x => x.value),
                      backgroundColor: '#f97316',
                      borderRadius: 8,
                      barThickness: 10
                    }]
                  }}
                  options={horizontalBarOptions}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── BACK / COLLAPSE BUTTON ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <button
          onClick={onClose}
          style={{
            backgroundColor: 'rgba(30, 41, 72, 0.6)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            padding: '10px 22px',
            fontSize: '13px',
            fontWeight: '700',
            borderRadius: '30px',
            fontFamily: "'Inter', sans-serif",
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.backgroundColor = 'rgba(40, 55, 95, 0.8)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.backgroundColor = 'rgba(30, 41, 72, 0.6)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
          }}
        >
          Collapse Analysis
        </button>
      </div>
    </div>
  );
};

export default DetailedGapAnalysis;
