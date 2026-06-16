import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useData } from '../../context/DataContext';

ChartJS.register(ArcElement, Tooltip, Legend);

const PALETTE = ['#EF4444','#1677FF','#22C55E','#F59E0B','#8B5CF6','#0EA5E9','#64748B','#EC4899'];

const RiskChart = () => {
  const { appData } = useData();
  const { labels = [], data = [] } = appData.chartData?.byRisk || {};

  const chartData = {
    labels,
    datasets: [{
      data,
      backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]),
      borderColor: '#FFFFFF',
      borderWidth: 2,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { font: { family: 'Inter', size: 10 }, boxWidth: 10, padding: 8 },
      },
      tooltip: {
        backgroundColor: '#0F172A',
        titleFont: { family: 'Inter', size: 11 },
        bodyFont:  { family: 'Inter', size: 11 },
        padding: 8,
        cornerRadius: 6,
      },
    },
  };

  const isEmpty = labels.length === 0;

  return (
    <div style={{ height: '320px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'transparent' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="title" style={{ margin: 0 }}>
          Controls by <span>Risk</span>
        </h2>
      </div>
      <div style={{ flex: 1, position: 'relative', display:'flex', justifyContent:'center', alignItems:'center' }}>
        {isEmpty ? (
          <span style={{ color:'var(--text-muted)', fontSize:'12px' }}>Upload file to populate</span>
        ) : (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <Pie data={chartData} options={options} />
          </div>
        )}
      </div>
    </div>
  );
};

export default RiskChart;
