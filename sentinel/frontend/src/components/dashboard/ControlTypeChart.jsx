import React, { useRef, useEffect, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import { useData } from '../../context/DataContext';

ChartJS.register(ArcElement, Tooltip);

const centerText = {
  id: 'centerText',
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

const ControlTypeChart = () => {
  const { appData } = useData();
  const cardRef = useRef(null);

  // Subscribe to theme-changed events
  const [theme, setTheme] = useState(() => document.body.classList.contains('light-mode') ? 'light' : 'dark');
  useEffect(() => {
    const handleThemeChange = () => {
      setTheme(document.body.classList.contains('light-mode') ? 'light' : 'dark');
    };
    window.addEventListener('theme-changed', handleThemeChange);
    return () => window.removeEventListener('theme-changed', handleThemeChange);
  }, []);

  const byType = appData.chartData?.byType || { labels: [], data: [] };
  const labels = byType.labels || [];
  const rawData = byType.data || [];
  const total = rawData.reduce((s, v) => s + v, 0);
  const isEmpty = labels.length === 0;

  const manualIdx = labels.findIndex(l => l.toLowerCase() === 'manual');
  const semiIdx = labels.findIndex(l => l.toLowerCase().includes('semi') || l.toLowerCase().includes('hybrid'));
  const autoIdx = labels.findIndex(l => l.toLowerCase() === 'automated' || l.toLowerCase() === 'automatic');

  const manualCount = manualIdx !== -1 ? rawData[manualIdx] : 0;
  const semiCount = semiIdx !== -1 ? rawData[semiIdx] : 0;
  const autoCount = autoIdx !== -1 ? rawData[autoIdx] : 0;

  const chartOptions = {
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
        borderColor: theme === 'light' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 138, 0, 0.3)',
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

  const chartData = {
    labels: ['Manual', 'Semi-Automated', 'Automated'],
    datasets: [{
      data: [manualCount, semiCount, autoCount],
      backgroundColor: [
        '#ff7a00',
        '#ffb86b',
        '#ffe5c1'
      ],
      borderWidth: 0,
      spacing: 6,
      borderRadius: 14,
      hoverOffset: 10
    }]
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
    <div ref={cardRef} className="automation-card">
      <style>{`
        .automation-card {
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
                    rgba(255,122,0,0.12),
                    transparent 35%
                ),
                linear-gradient(
                    145deg,
                    #03071d,
                    #040b2d 55%,
                    #020617
                );
            border: 1px solid rgba(255,140,0,0.22);
            box-shadow:
                0 10px 40px rgba(0,0,0,0.45),
                inset 0 1px 0 rgba(255,255,255,0.03);
            backdrop-filter: blur(20px);
            transition: background 0.3s, border-color 0.3s;
        }

        /* Light Mode Specific Overrides */
        .light-mode .automation-card {
            background:
                radial-gradient(
                    circle at bottom right,
                    rgba(255,122,0,0.15),
                    transparent 35%
                ),
                rgba(255, 255, 255, 0.88) !important;
            border: 1px solid rgba(255,140,0,0.3) !important;
            box-shadow:
                0 10px 40px rgba(0,0,0,0.06),
                inset 0 1px 0 rgba(255,255,255,0.8) !important;
        }

        .light-mode .automation-card .title,
        .light-mode .automation-card .legend-item {
            color: #0f172a !important;
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
            color: #ff8a1f;
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

        #automationChart {
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

        .manual {
            background: #ff7a00;
            box-shadow: 0 0 14px rgba(255,122,0,.9);
        }

        .semi {
            background: #ffb86b;
            box-shadow: 0 0 14px rgba(255,184,107,.7);
        }

        .auto {
            background: #ffe5c1;
            box-shadow: 0 0 14px rgba(255,229,193,.6);
        }
      `}</style>

      <div className="card-noise"></div>
      <div className="ambient-glow"></div>

      <h2 className="title">
        Controls by <span>Automation Type</span>
      </h2>

      <div className="content">
        <div className="chart-section">
          <div id="automationChart">
            {!isEmpty ? (
              <Doughnut data={chartData} options={chartOptions} plugins={[centerText]} />
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '14px', fontFamily: 'Inter' }}>
                Upload file to populate
              </div>
            )}
          </div>
        </div>

        {!isEmpty && (
          <div className="legend">
            <div className="legend-item">
              <div className="left">
                <div className="dot manual"></div>
                <span>Manual</span>
              </div>
              <strong>{manualCount}</strong>
            </div>

            <div className="legend-item">
              <div className="left">
                <div className="dot semi"></div>
                <span>Semi-Automated</span>
              </div>
              <strong>{semiCount}</strong>
            </div>

            <div className="legend-item">
              <div className="left">
                <div className="dot auto"></div>
                <span>Automated</span>
              </div>
              <strong>{autoCount}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlTypeChart;
