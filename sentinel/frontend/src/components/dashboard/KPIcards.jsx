import { ShieldCheck, AlertTriangle, Hand, Cpu, Workflow } from 'lucide-react';
import { useData } from '../../context/DataContext';

const KPIcards = () => {
  const { appData } = useData();
  const kpis = appData.kpis || {};

  const cards = [
    ['Total Controls', kpis.totalControls ?? 0, ShieldCheck, 'var(--primary)'],
    ['Total Risks', kpis.totalRisks ?? 0, AlertTriangle, 'var(--warning)'],
    ['High-Risk Controls', kpis.highRisks ?? 0, AlertTriangle, 'var(--danger)'],
    ['Manual Controls', kpis.manualControls ?? 0, Hand, 'var(--accent-violet)'],
    ['Automated Controls', kpis.automatedControls ?? 0, Cpu, 'var(--success)'],
    ['Processes', kpis.processCount ?? 0, Workflow, 'var(--primary)'],
  ];

  return (
    <div className="kpi-grid">
      {cards.map(([title, value, Icon, color]) => (
        <div key={title} className="card" style={{ padding: '16px', gap: '8px' }}>
          <Icon size={18} style={{ color }} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{title}</span>
          <span style={{ fontSize: '24px', fontWeight: 700 }}>{value}</span>
        </div>
      ))}
    </div>
  );
};

export default KPIcards;
