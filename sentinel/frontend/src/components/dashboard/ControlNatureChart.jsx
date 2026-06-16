import React, { useRef, useEffect, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import { useData } from '../../context/DataContext';

ChartJS.register(ArcElement, Tooltip);

const centerTextPlugin = {
  id: 'centerTextNature',
  afterDraw(chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    
    const x = (chartArea.left + chartArea.right) / 2;
    const y = (chartArea.top + chartArea.bottom) / 2;

    const total = chart.config.options.plugins.centerText?.total || 0;
    const isLight = document.body.classList.contains('light-mode');

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.font = '700 24px Inter';
    ctx.fillStyle = isLight ? '#0f172a' : 'white';
    ctx.fillText(total, x, y - 8);

    ctx.font = '500 10px Inter';
    ctx.fillStyle = isLight ? '#475569' : '#ffffff';
    ctx.fillText('Total', x, y + 12);

    ctx.restore();
  }
};

const CHART_COLORS = {
  preventive: '#818cf8', // indigo
  detective: '#c084fc',  // purple
  other: '#f472b6'       // pink
};

const ControlNatureChart = () => {
  const { appData } = useData();
  const cardRef = useRef(null);
  const { rows = [], columnMap = {} } = appData;

  // Subscribe to theme-changed events
  const [theme, setTheme] = useState(() => document.body.classList.contains('light-mode') ? 'light' : 'dark');
  useEffect(() => {
    const handleThemeChange = () => {
      setTheme(document.body.classList.contains('light-mode') ? 'light' : 'dark');
    };
    window.addEventListener('theme-changed', handleThemeChange);
    return () => window.removeEventListener('theme-changed', handleThemeChange);
  }, []);

  const getVal = (item, logicalKey) => {
    if (!item) return '';
    if (columnMap && columnMap[logicalKey] && item[columnMap[logicalKey]] !== undefined) {
      return String(item[columnMap[logicalKey]] || '').trim();
    }
    const synonyms = {
      control_nature: ['controlNature', 'control_nature', 'Control Nature', 'Control nature']
    };
    const keys = synonyms[logicalKey] || [logicalKey];
    for (const k of keys) {
      if (item[k] !== undefined) {
        return String(item[k] || '').trim();
      }
    }
    return '';
  };

  const natureCounts = {};
  rows.forEach(row => {
    let nature = getVal(row, 'control_nature').trim();
    if (!nature) {
      nature = 'Unspecified';
    }
    nature = nature.charAt(0).toUpperCase() + nature.slice(1).toLowerCase();
    natureCounts[nature] = (natureCounts[nature] || 0) + 1;
  });

  const labels = Object.keys(natureCounts);
  const data = Object.values(natureCounts);
  const total = data.reduce((sum, v) => sum + v, 0);
  const isEmpty = rows.length === 0;

  const getThemeColor = (label) => {
    const l = label.toLowerCase();
    if (l.includes('preventive')) return CHART_COLORS.preventive;
    if (l.includes('detective')) return CHART_COLORS.detective;
    return CHART_COLORS.other;
  };

  const colors = labels.map(getThemeColor);

  const chartData = {
    labels,
    datasets: [{
      data,
      backgroundColor: colors,
      borderWidth: 0,
      spacing: 6,
      borderRadius: 14,
      hoverOffset: 10
    }]
  };

  const options = {
    responsive: true,
    cutout: '58%',
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.95)',
        titleFont: { family: 'Inter', size: 12, weight: 'bold' },
        bodyFont: { family: 'Inter', size: 12 },
        titleColor: theme === 'light' ? '#0f172a' : '#ffffff',
        bodyColor: theme === 'light' ? '#0f172a' : '#ffffff',
        padding: 10,
        cornerRadius: 8,
        borderColor: theme === 'light' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(129, 140, 248, 0.3)',
        borderWidth: 1,
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${ctx.parsed} controls`
        }
      },
      centerText: {
        total: total
      }
    }
  };

  // Strip parent styles to avoid conflicts
  useEffect(() => {
    if (cardRef.current) {
      const parent = cardRef.current.parentElement;
      if (parent && parent.classList.contains('chart-card-3d')) {
        parent.style.background = 'none';
        parent.style.border = 'none';
        parent.style.boxShadow = 'none';
        parent.style.padding = '0';
        parent.style.backdropFilter = 'none';
        parent.style.height = 'auto';
        parent.style.overflow = 'visible';
      }
    }
  }, []);

  return (
    <div ref={cardRef} className="nature-card">
      <style>{`
        .nature-card {
            position: relative;
            width: 100%;
            height: 100%;
            min-height: 380px;
            overflow: hidden;
            border-radius: 26px;
            padding: 26px;
            background:
                radial-gradient(
                    circle at bottom right,
                    rgba(45,212,191,0.12),
                    transparent 35%
                ),
                linear-gradient(
                    145deg,
                    #03071d,
                    #040b2d 55%,
                    #020617
                );
            border: 1px solid rgba(45, 212, 191, 0.22);
            box-shadow:
                0 10px 40px rgba(0,0,0,0.45),
                inset 0 1px 0 rgba(255,255,255,0.03);
            backdrop-filter: blur(20px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Light Mode Specific Overrides */
        .light-mode .nature-card {
            background:
                radial-gradient(
                    circle at bottom right,
                    rgba(45,212,191,0.15),
                    transparent 35%
                ),
                rgba(255, 255, 255, 0.88) !important;
            border: 1px solid rgba(45, 212, 191, 0.3) !important;
            box-shadow:
                0 10px 40px rgba(0,0,0,0.06),
                inset 0 1px 0 rgba(255,255,255,0.8) !important;
        }

        .light-mode .nature-card .title,
        .light-mode .nature-card .legend-item {
            color: #0f172a !important;
        }

        .nature-card:hover {
            transform: translateY(-4px);
            border-color: rgba(45, 212, 191, 0.45);
            box-shadow:
                0 16px 48px rgba(0,0,0,0.55),
                0 0 24px rgba(45, 212, 191, 0.15),
                inset 0 1px 0 rgba(255,255,255,0.04);
        }

        .title {
            position: relative;
            z-index: 5;
            font-size: 16px;
            font-weight: 600;
            color: white;
            font-family: Inter, sans-serif;
            margin-top: 0;
            margin-bottom: 16px;
        }

        .title span {
            color: #2dd4bf;
        }

        .content {
            position: relative;
            z-index: 5;
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: calc(100% - 70px);
        }

        .chart-section {
            position: relative;
            width: 55%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        #natureChart {
            width: 220px !important;
            height: 220px !important;
            position: relative;
            z-index: 5;
        }

        .legend {
            width: 40%;
            display: flex;
            flex-direction: column;
            gap: 16px;
            padding-right: 10px;
        }

        .legend-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            color: white;
            font-size: 14px;
            font-weight: 500;
            font-family: Inter, sans-serif;
            margin: 0;
        }

        .left {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            flex-shrink: 0;
        }

        .preventive {
            background: #818cf8;
            box-shadow: 0 0 14px rgba(129, 140, 248, .9);
        }

        .detective {
            background: #c084fc;
            box-shadow: 0 0 14px rgba(192, 132, 252, .9);
        }

        .other {
            background: #f472b6;
            box-shadow: 0 0 14px rgba(244, 114, 182, .9);
        }
      `}</style>

      <div className="card-noise"></div>
      <div className="ambient-glow"></div>

      <h2 className="title">
        Controls Profile <span>Distribution</span>
      </h2>

      <div className="content">
        <div className="chart-section">
          <div id="natureChart">
            {!isEmpty ? (
              <Doughnut data={chartData} options={options} plugins={[centerTextPlugin]} />
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '14px', fontFamily: 'Inter' }}>
                Upload file to populate
              </div>
            )}
          </div>
        </div>

        {!isEmpty && (
          <div className="legend">
            {labels.map((label, idx) => {
              const l = label.toLowerCase();
              const isPreventive = l.includes('preventive');
              const isDetective = l.includes('detective');
              const dotClass = isPreventive ? 'dot preventive' : isDetective ? 'dot detective' : 'dot other';
              
              return (
                <div className="legend-item" key={label}>
                  <div className="left">
                    <div className={dotClass}></div>
                    <span>{label}</span>
                  </div>
                  <strong>{data[idx]}</strong>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlNatureChart;
