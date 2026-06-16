import React, { useState, useEffect } from 'react';
import { FileText, AlertTriangle, Cpu, Target, TrendingUp } from 'lucide-react';

const ExecutiveSummary = () => {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analyze-dataset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setInsight(data.insight);
      } else {
        setError(data.error || "Failed to generate summary");
      }
    } catch (e) {
      setError("Network error connecting to analysis service");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleGenerate();
  }, []);

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '16px', borderTop: '4px solid var(--primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ backgroundColor: 'var(--primary-light)', padding: '8px', borderRadius: 'var(--radius-md)' }}>
            <TrendingUp size={20} style={{ color: 'var(--primary)' }} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Executive Insights</h2>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div className="spinner" style={{
            width: '32px', height: '32px', border: '4px solid var(--border)',
            borderTopColor: 'var(--primary)', borderRadius: '50%',
            animation: 'spin 1s linear infinite', margin: '0 auto 16px'
          }}></div>
          <span style={{ color: 'var(--text-muted)' }}>Analyzing the entire dataset...</span>
        </div>
      )}

      {error && (
        <div style={{ padding: '16px', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-md)' }}>
          {error}
        </div>
      )}

      {insight && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ padding: '16px', backgroundColor: 'var(--bg-muted)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '600' }}>
              <FileText size={16} /> Executive Summary
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '14px' }}>
              {insight.executive_summary}
            </p>
          </div>

          <div className="grid-3" style={{ gap: '16px' }}>
            
            <div style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--danger)', fontWeight: '600' }}>
                <AlertTriangle size={16} /> Key Risks
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(insight.key_risks || []).map((risk, i) => (
                  <li key={i}>{risk}</li>
                ))}
              </ul>
            </div>

            <div style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--primary-hover)', fontWeight: '600' }}>
                <Cpu size={16} /> Automation Opportunities
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(insight.automation_opportunities || []).map((opp, i) => (
                  <li key={i}>{opp}</li>
                ))}
              </ul>
            </div>

            <div style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--success)', fontWeight: '600' }}>
                <Target size={16} /> Audit Priorities
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(insight.audit_priorities || []).map((pri, i) => (
                  <li key={i}>{pri}</li>
                ))}
              </ul>
            </div>

          </div>
          
        </div>
      )}
    </div>
  );
};

export default ExecutiveSummary;
