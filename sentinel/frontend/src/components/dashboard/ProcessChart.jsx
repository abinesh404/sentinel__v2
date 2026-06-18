import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { useData } from '../../context/DataContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// Rich, enterprise-grade multi-color palette — one color per process bar
const PROCESS_COLORS = [
  '#6366F1', // indigo
  '#EC4899', // pink
  '#F59E0B', // amber
  '#10B981', // emerald
  '#3B82F6', // blue
  '#EF4444', // red
  '#8B5CF6', // violet
  '#14B8A6', // teal
  '#F97316', // orange
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#A78BFA', // purple-light
];

const ProcessChart = () => {
  const { appData } = useData();

  // Theme listener hook
  const [theme, setTheme] = useState(() => document.body.classList.contains('light-mode') ? 'light' : 'dark');
  useEffect(() => {
    const handleThemeChange = () => {
      setTheme(document.body.classList.contains('light-mode') ? 'light' : 'dark');
    };
    window.addEventListener('theme-changed', handleThemeChange);
    return () => window.removeEventListener('theme-changed', handleThemeChange);
  }, []);

  const [level, setLevel] = useState('level1');

  const byProcess = appData.chartData?.byProcess || { labels: [], data: [] };
  // Sort by count descending so tallest bars appear first
  const rawLabels = byProcess.labels || [];
  const rawData = byProcess.data || [];
  const sortedPairs = rawLabels.map((l, i) => ({ label: l, value: rawData[i] }))
    .sort((a, b) => b.value - a.value);

  let labels = [];
  let data = [];

  if (level === 'level1') {
    if (sortedPairs.length <= 11) {
      labels = sortedPairs.map(p => p.label);
      data = sortedPairs.map(p => p.value);
    } else {
      const top11 = sortedPairs.slice(0, 11);
      const others = sortedPairs.slice(11);
      const sumOthers = others.reduce((acc, curr) => acc + curr.value, 0);
      labels = top11.map(p => p.label);
      data = top11.map(p => p.value);
      if (sumOthers > 0) {
        labels.push('Other Process');
        data.push(sumOthers);
      }
    }
  } else {
    labels = sortedPairs.map(p => p.label);
    data = sortedPairs.map(p => p.value);
  }

  const colors = labels.map((_, i) => PROCESS_COLORS[i % PROCESS_COLORS.length]);
  const hoverColors = colors.map(c => c + 'CC'); // slight transparency on hover

  // Truncate X-axis labels to prevent overlap/collision
  const truncatedLabels = labels.map(l => l.length > 15 ? l.slice(0, 15) + '...' : l);

  const chartData = {
    labels: truncatedLabels,
    datasets: [
      {
        label: 'Controls',
        data,
        backgroundColor: (ctx) => colors[ctx.dataIndex % colors.length],
        hoverBackgroundColor: hoverColors,
        borderRadius: 10,
        borderSkipped: false,
        barThickness: 22,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.95)',
        titleFont: { family: 'Inter', size: 11, weight: 'bold' },
        bodyFont: { family: 'Inter', size: 11 },
        titleColor: theme === 'light' ? '#0f172a' : '#ffffff',
        bodyColor: theme === 'light' ? '#0f172a' : '#ffffff',
        padding: 12,
        cornerRadius: 10,
        borderColor: theme === 'light' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.2)',
        borderWidth: 1,
        callbacks: {
          title: (tooltipItems) => {
            const index = tooltipItems[0].dataIndex;
            return labels[index]; // Original untruncated title
          },
          label: (ctx) => ` ${ctx.parsed.y} controls`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: 'Inter', size: 9 },
          color: theme === 'light' ? '#0f172a' : '#ffffff',
          maxRotation: 45,
          minRotation: 45,
          autoSkip: true,
        },
      },
      y: {
        grid: { color: theme === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.06)' },
        ticks: {
          font: { family: 'Inter', size: 10 },
          color: theme === 'light' ? '#0f172a' : '#ffffff',
          stepSize: 1,
        },
        border: { dash: [3, 3] },
      },
    },
  };

  const isEmpty = labels.length === 0;

  const selectStyle = {
    background: theme === 'light' ? '#f1f5f9' : 'rgba(30, 41, 59, 0.7)',
    color: theme === 'light' ? '#0f172a' : '#ffffff',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '12.5px',
    fontWeight: '600',
    outline: 'none',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: '12px', backgroundColor: 'transparent' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <h2 className="title" style={{ margin: 0 }}>
          Controls by <span>Process Area</span>
        </h2>
        {!isEmpty && (
          <select 
            value={level} 
            onChange={(e) => setLevel(e.target.value)} 
            style={selectStyle}
            onMouseEnter={(e) => {
              e.target.style.borderColor = 'rgba(99, 102, 241, 0.6)';
              e.target.style.background = theme === 'light' ? '#e2e8f0' : 'rgba(30, 41, 59, 0.9)';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = 'var(--border)';
              e.target.style.background = theme === 'light' ? '#f1f5f9' : 'rgba(30, 41, 59, 0.7)';
            }}
          >
            <option value="level1" style={{ background: theme === 'light' ? '#ffffff' : '#0f172a', color: theme === 'light' ? '#0f172a' : '#ffffff' }}>Level 1</option>
            <option value="level2" style={{ background: theme === 'light' ? '#ffffff' : '#0f172a', color: theme === 'light' ? '#0f172a' : '#ffffff' }}>Level 2</option>
          </select>
        )}
      </div>
      <div style={{ flex: '1 1 auto', minHeight: '160px', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {isEmpty ? (
          <span style={{ color: '#64748b', fontSize: '12px' }}>Upload file to populate</span>
        ) : (
          <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
            <Bar data={chartData} options={options} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessChart;
