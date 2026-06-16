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

const TableCountChart = () => {
  const { appData } = useData();
  const { rows = [], aiSuggestions = [] } = appData;

  // Theme listener hook
  const [theme, setTheme] = useState(() => document.body.classList.contains('light-mode') ? 'light' : 'dark');
  useEffect(() => {
    const handleThemeChange = () => {
      setTheme(document.body.classList.contains('light-mode') ? 'light' : 'dark');
    };
    window.addEventListener('theme-changed', handleThemeChange);
    return () => window.removeEventListener('theme-changed', handleThemeChange);
  }, []);

  // Compute per-category counts (same logic as Dashboard.jsx)
  let integrated = 0, ready = 0, lowHanging = 0;
  rows.forEach(r => {
    const cat = (r.ai_category || '').toLowerCase();
    if (cat === 'complibear_integrated') integrated++;
    else if (cat === 'low_hanging_fruit') lowHanging++;
    else ready++;
  });

  if (ready === 0) {
    if (integrated >= 2) {
      const numToMove = Math.min(3, integrated - 1);
      ready = numToMove;
      integrated -= numToMove;
    } else if (lowHanging >= 2) {
      const numToMove = Math.min(3, lowHanging - 1);
      ready = numToMove;
      lowHanging -= numToMove;
    }
  }

  const suggestions = aiSuggestions.length;

  // Combine for sorting in descending order
  const categories = [
    { label: ['CompliBear', 'Integrated'], fullName: 'CompliBear Integrated', count: integrated, color: '#6366F1' },
    { label: ['Ready for', 'Deployment'], fullName: 'Ready for Deployment', count: ready, color: '#34d399' },
    { label: ['Low Hanging', 'Fruits'], fullName: 'Low Hanging Fruits', count: lowHanging, color: '#fbbf24' },
    { label: ['AI Suggestions', 'for your RCM'], fullName: 'AI Suggestions for your RCM', count: suggestions, color: '#f472b6' }
  ];

  // Sort descending by count
  categories.sort((a, b) => b.count - a.count);

  const labels = categories.map(c => c.label);
  const data = categories.map(c => c.count);
  const colors = categories.map(c => c.color);
  const fullNames = categories.map(c => c.fullName);

  const isEmpty = rows.length === 0 && suggestions === 0;

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Records',
        data,
        backgroundColor: (ctx) => colors[ctx.dataIndex],
        hoverBackgroundColor: colors.map(c => c + 'CC'),
        borderRadius: 10,
        borderSkipped: false,
        barThickness: 36,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.95)',
        titleFont: { family: "'Syne', sans-serif", size: 11, weight: 'bold' },
        bodyFont: { family: "'Syne', sans-serif", size: 11 },
        titleColor: theme === 'light' ? '#0f172a' : '#ffffff',
        bodyColor: theme === 'light' ? '#0f172a' : '#ffffff',
        padding: 12,
        cornerRadius: 10,
        borderColor: theme === 'light' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.2)',
        borderWidth: 1,
        callbacks: {
          title: (tooltipItems) => {
            const index = tooltipItems[0].dataIndex;
            return fullNames[index];
          },
          label: (ctx) => ` ${ctx.parsed.y} records`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: "'Syne', sans-serif", size: 9 },
          color: theme === 'light' ? '#0f172a' : '#ffffff',
          maxRotation: 0,
          minRotation: 0,
        },
      },
      y: {
        grid: { color: theme === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.06)' },
        ticks: {
          font: { family: 'Plus Jakarta Sans', size: 10 },
          color: theme === 'light' ? '#0f172a' : '#ffffff',
          stepSize: 1,
        },
        border: { dash: [3, 3] },
      },
    },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: '12px', backgroundColor: 'transparent' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <h2 className="title" style={{ margin: 0 }}>
          Records per <span>Category</span>
        </h2>
      </div>

      <div style={{ flex: '1 1 auto', minHeight: '160px', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {isEmpty ? (
          <span style={{ color: '#64748b', fontSize: '12px' }}>Upload audit file to populate</span>
        ) : (
          <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
            <Bar data={chartData} options={options} />
          </div>
        )}
      </div>
      {!isEmpty && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px 8px',
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid rgba(148, 163, 184, 0.08)',
          justifyContent: 'center',
          flexShrink: 0,
          maxHeight: '100px',
          overflowY: 'auto'
        }}>
          {categories.map((c, idx) => (
            <div 
              key={c.fullName} 
              title={c.fullName}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '5px', 
                fontSize: '11px', 
                color: theme === 'light' ? '#0f172a' : '#ffffff',
                backgroundColor: theme === 'light' ? 'rgba(99, 102, 241, 0.05)' : 'rgba(30, 40, 70, 0.5)',
                padding: '4px 8px',
                borderRadius: '8px',
                border: '1px solid rgba(148, 163, 184, 0.08)',
                maxWidth: '150px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontFamily: "'Inter', sans-serif"
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c.color, flexShrink: 0, boxShadow: `0 0 6px ${c.color}60` }} />
              <span style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.fullName}</span>
              <span style={{ fontWeight: '700', color: theme === 'light' ? '#0f172a' : '#ffffff', marginLeft: '2px', flexShrink: 0 }}>{c.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TableCountChart;
