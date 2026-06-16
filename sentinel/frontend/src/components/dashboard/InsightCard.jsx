import React from 'react';
import { Lightbulb, AlertTriangle, ShieldCheck, Cpu } from 'lucide-react';

const InsightCard = ({ insight, loading }) => {
  if (loading) {
    return (
      <div className="card" style={{ padding: '24px', textAlign: 'center', marginTop: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div className="spinner" style={{
            width: '24px', height: '24px', border: '3px solid var(--border)',
            borderTopColor: 'var(--primary)', borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Analyzing control...</span>
        </div>
      </div>
    );
  }

  if (!insight) return null;

  const { risk_level, key_concern, recommendation, automation_opportunity } = insight;

  return (
    <div className="card" style={{ marginTop: '16px', borderLeft: '4px solid var(--primary)' }}>
      <div className="card-title" style={{ borderBottom: 'none', paddingBottom: '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lightbulb size={18} style={{ color: 'var(--primary)' }} />
          <span>Risk Analysis</span>
        </div>
        <span className={`badge ${risk_level === 'HIGH' ? 'badge-danger' : risk_level === 'MEDIUM' ? 'badge-warning' : 'badge-success'}`}>
          {risk_level} RISK
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
        
        {/* Key Concern */}
        <div style={{ backgroundColor: 'var(--bg-muted)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontWeight: '600', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <AlertTriangle size={14} /> Key Concern
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
            {key_concern}
          </div>
        </div>

        {/* Audit Recommendation */}
        <div style={{ backgroundColor: 'var(--success-light)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontWeight: '600', fontSize: '12px', color: 'var(--success)' }}>
            <ShieldCheck size={14} /> Recommendation
          </div>
          <div style={{ fontSize: '13px', color: 'var(--success)' }}>
            {recommendation}
          </div>
        </div>

        {/* Automation Opportunity */}
        <div style={{ backgroundColor: 'var(--primary-light)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontWeight: '600', fontSize: '12px', color: 'var(--primary-hover)' }}>
            <Cpu size={14} /> Automation Potential
          </div>
          <div style={{ fontSize: '13px', color: 'var(--primary-hover)' }}>
            {automation_opportunity}
          </div>
        </div>

      </div>
    </div>
  );
};

export default InsightCard;
