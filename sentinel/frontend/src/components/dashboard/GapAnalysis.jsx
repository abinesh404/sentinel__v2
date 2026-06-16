import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from 'chart.js';
import { useData } from '../../context/DataContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const hBarOptions = () => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#0F172A',
      titleFont: { family: 'Inter', size: 11 },
      bodyFont:  { family: 'Inter', size: 11 },
      padding: 8,
      cornerRadius: 6,
    },
  },
  scales: {
    x: {
      grid: { color: '#E2E8F0' },
      ticks: { font: { family: 'Inter', size: 10 }, color: '#64748B' },
      border: { dash: [3, 3] },
    },
    y: {
      grid: { display: false },
      ticks: { font: { family: 'Inter', size: 10 }, color: '#1E293B' },
    },
  },
});

const buildDataset = (data, color) => ({
  data,
  backgroundColor: color,
  borderColor: color,
  borderWidth: 1,
  borderRadius: 3,
  barThickness: 14,
});

const EmptyState = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
                height:'100%', color:'var(--text-muted)', fontSize:'12px' }}>
    Upload an audit file to populate
  </div>
);

const GapAnalysis = () => {
  const { appData } = useData();
  const topRisks     = appData.chartData?.topRisks     || { labels: [], data: [] };
  const controlNature = appData.chartData?.byNature || { labels: [], data: [] };

  const risksChartData = {
    labels: topRisks.labels,
    datasets: [buildDataset(topRisks.data, '#EF4444')],
  };

  const natureChartData = {
    labels: controlNature.labels,
    datasets: [buildDataset(controlNature.data, '#F59E0B')],
  };

  return (
    <div className="grid-2">
      {/* Top Risks */}
      <div className="card" style={{ height: '300px' }}>
        <div className="card-title">
          <span>High-Risk Controls by Process</span>
          <span style={{ fontSize: '10px', color: 'var(--risk-red)', fontWeight: '600',
                         backgroundColor: 'var(--risk-light)', padding: '1px 5px', borderRadius: '2px' }}>
            Risk-level based
          </span>
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          {topRisks.labels.length === 0
            ? <EmptyState />
            : <Bar data={risksChartData} options={hBarOptions('#EF4444')} />}
        </div>
      </div>

      {/* Control Nature */}
      <div className="card" style={{ height: '300px' }}>
        <div className="card-title">
          <span>Controls by Nature</span>
          <span style={{ fontSize: '10px', color: 'var(--warning-orange)', fontWeight: '600',
                         backgroundColor: 'var(--warning-light)', padding: '1px 5px', borderRadius: '2px' }}>
            Dynamic
          </span>
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          {controlNature.labels.length === 0
            ? <EmptyState />
            : <Bar data={natureChartData} options={hBarOptions('#F59E0B')} />}
        </div>
      </div>
    </div>
  );
};

export default GapAnalysis;
