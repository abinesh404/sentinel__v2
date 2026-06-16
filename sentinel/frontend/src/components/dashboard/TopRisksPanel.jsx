import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { 
  ChevronDown, 
  ChevronUp, 
  Cpu, 
  TrendingUp, 
  AlertTriangle, 
  ShieldAlert, 
  Activity, 
  Layers, 
  Clock, 
  FileText,
  Search,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

const TopRisksPanel = () => {
  const { appData } = useData();
  const { top5Risks = [], tenantId = 'CJSJ' } = appData;
  
  const [expandedProcess, setExpandedProcess] = useState(null);
  const [drillDownData, setDrillDownData] = useState({});
  const [loadingProcess, setLoadingProcess] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleToggle = async (processName) => {
    if (expandedProcess === processName) {
      setExpandedProcess(null);
      return;
    }

    setExpandedProcess(processName);

    // If data is already fetched, do not fetch again
    if (drillDownData[processName]) return;

    setLoadingProcess(processName);
    try {
      const response = await fetch(`/api/top-risks?process=${encodeURIComponent(processName)}&tenant_id=${tenantId}`);
      const data = await response.json();
      setDrillDownData(prev => ({
        ...prev,
        [processName]: data
      }));
    } catch (error) {
      console.error("Failed to load drilldown details:", error);
    } finally {
      setLoadingProcess(null);
    }
  };

  // Auto-expand the first risk category on load to drive interaction
  useEffect(() => {
    if (top5Risks && top5Risks.length > 0 && !expandedProcess) {
      handleToggle(top5Risks[0].process);
    }
  }, [top5Risks]);

  const getScoreColorClass = (score) => {
    if (score >= 80) return 'score-critical';
    if (score >= 60) return 'score-high';
    if (score >= 40) return 'score-medium';
    return 'score-low';
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'badge-critical';
      case 'HIGH': return 'badge-high';
      case 'MEDIUM': return 'badge-medium';
      default: return 'badge-low';
    }
  };

  if (!top5Risks || top5Risks.length === 0) {
    return null; // Don't render if no top risks computed yet
  }

  return (
    <div className="card top-risks-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '8px' }}>
            <ShieldAlert size={20} style={{ color: 'var(--danger)' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Top 5 Highest Risk Process Areas</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Dynamically calculated and ranked based on risk scoring formula</p>
          </div>
        </div>
        <div className="badge badge-danger" style={{ fontSize: '11px', fontWeight: '700' }}>
          Action Required
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {top5Risks.map((process, idx) => {
          const isExpanded = expandedProcess === process.process;
          const details = drillDownData[process.process];
          const isLoading = loadingProcess === process.process;

          return (
            <div 
              key={process.process} 
              className={`risk-accordion-item ${isExpanded ? 'expanded' : ''}`}
              style={{
                border: '1px solid var(--border)',
                borderRadius: '12px',
                overflow: 'hidden',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                background: isExpanded ? 'rgba(22, 119, 255, 0.01)' : 'var(--bg-card)',
                boxShadow: isExpanded ? 'var(--shadow-md)' : 'none'
              }}
            >
              {/* Accordion Header */}
              <div 
                onClick={() => handleToggle(process.process)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '18px 24px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.2s ease'
                }}
                className="risk-accordion-header"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                  {/* Rank number badge */}
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: isExpanded ? 'var(--primary)' : 'var(--bg-muted)',
                    color: isExpanded ? 'var(--text-inverse)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}>
                    {idx + 1}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {process.process}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Layers size={13} /> {process.total_controls} Controls
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertTriangle size={13} /> {process.total_risks} Risks
                      </span>
                      {process.manual_controls > 0 && (
                        <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)', fontWeight: '600' }}>
                          {process.manual_controls} Manual
                        </span>
                      )}
                      {process.failed_controls > 0 && (
                        <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', fontWeight: '700' }}>
                          {process.failed_controls} Failed
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  {/* Risk Score Progress & Badge */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Risk Score:</span>
                      <span className={`risk-score-value ${getScoreColorClass(process.risk_score)}`} style={{ fontSize: '16px', fontWeight: '800' }}>
                        {process.risk_score}
                      </span>
                    </div>
                    {/* Tiny progress bar */}
                    <div style={{ width: '80px', height: '5px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${process.risk_score}%`, 
                        height: '100%', 
                        backgroundColor: process.risk_score >= 80 ? 'var(--danger)' : process.risk_score >= 60 ? '#EA580C' : process.risk_score >= 40 ? 'var(--warning)' : 'var(--success)'
                      }} />
                    </div>
                  </div>

                  <span className={`priority-badge ${getPriorityBadgeClass(process.audit_priority)}`}>
                    {process.audit_priority}
                  </span>

                  {isExpanded ? <ChevronUp size={20} style={{ color: 'var(--text-secondary)' }} /> : <ChevronDown size={20} style={{ color: 'var(--text-secondary)' }} />}
                </div>
              </div>

              {/* Accordion Content */}
              {isExpanded && (
                <div style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--divider)' }}>
                  {isLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px' }}>
                      <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>Analyzing process-specific controls and drafting intelligence recommendations...</span>
                    </div>
                  ) : details ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      
                      {/* Section 1: Insights & Actions Card Grid */}
                      <div className="grid-3" style={{ gap: '16px' }}>
                        
                        {/* 10. Recommendations Card */}
                        <div style={{
                          borderLeft: '4px solid var(--accent-violet)',
                          backgroundColor: 'rgba(124, 58, 237, 0.03)',
                          borderRadius: '8px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-violet)' }}>
                            <FileText size={16} />
                            <span style={{ fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Evidence-Based Recommendations</span>
                          </div>
                          <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '13px', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {details.recommendations?.map((rec, i) => (
                              <li key={i} style={{ lineHeight: '1.5' }}>{rec}</li>
                            ))}
                          </ul>
                        </div>

                        {/* 11. Automation Opportunities Card */}
                        <div style={{
                          borderLeft: '4px solid var(--accent-teal)',
                          backgroundColor: 'rgba(15, 118, 110, 0.03)',
                          borderRadius: '8px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-teal)' }}>
                            <Cpu size={16} />
                            <span style={{ fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Automation Opportunities</span>
                          </div>
                          <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '13px', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {details.automationOpportunities?.map((opp, i) => (
                              <li key={i} style={{ lineHeight: '1.5' }}>{opp}</li>
                            ))}
                          </ul>
                        </div>

                        {/* 12. Expected Audit Impact Card */}
                        <div style={{
                          borderLeft: '4px solid var(--info)',
                          backgroundColor: 'rgba(14, 165, 233, 0.03)',
                          borderRadius: '8px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--info)' }}>
                            <TrendingUp size={16} />
                            <span style={{ fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Expected Audit Impact</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.5', fontWeight: '500' }}>
                            {details.expectedAuditImpact}
                          </p>
                        </div>
                      </div>

                      {/* Section 2: Detailed KPI Grid */}
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>
                          Process Risk Indicators
                        </span>
                        <div className="grid-6-custom" style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                          gap: '10px'
                        }}>
                          <div className="risk-indicator-tile">
                            <span className="tile-label">Failed Controls</span>
                            <span className={`tile-val ${process.failed_controls > 0 ? 'text-red' : 'text-green'}`}>{process.failed_controls}</span>
                          </div>
                          <div className="risk-indicator-tile">
                            <span className="tile-label">Control Gaps</span>
                            <span className={`tile-val ${process.control_gaps > 0 ? 'text-orange' : ''}`}>{process.control_gaps}</span>
                          </div>
                          <div className="risk-indicator-tile">
                            <span className="tile-label">Fraud Indicators</span>
                            <span className={`tile-val ${process.fraud_indicators > 0 ? 'text-red animate-pulse' : ''}`}>{process.fraud_indicators}</span>
                          </div>
                          <div className="risk-indicator-tile">
                            <span className="tile-label">SoD Conflicts</span>
                            <span className={`tile-val ${process.sod_conflicts > 0 ? 'text-orange' : ''}`}>{process.sod_conflicts}</span>
                          </div>
                          <div className="risk-indicator-tile">
                            <span className="tile-label">Missing Approvals</span>
                            <span className={`tile-val ${process.missing_approvals > 0 ? 'text-orange' : ''}`}>{process.missing_approvals}</span>
                          </div>
                          <div className="risk-indicator-tile">
                            <span className="tile-label">Missing Evidence</span>
                            <span className={`tile-val ${process.missing_evidence > 0 ? 'text-orange' : ''}`}>{process.missing_evidence}</span>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Traceable Controls Details Table */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Traceable Controls Table ({details.controls?.length} rows)
                          </span>
                          
                          {/* Inner search box */}
                          <div style={{ position: 'relative', width: '200px' }}>
                            <Search size={12} style={{ position: 'absolute', left: '8px', top: '9px', color: 'var(--text-muted)' }} />
                            <input 
                              type="text" 
                              placeholder="Search controls..." 
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              style={{
                                width: '100%',
                                height: '28px',
                                paddingLeft: '26px',
                                fontSize: '11px',
                                border: '1px solid var(--border)',
                                borderRadius: '6px',
                                outline: 'none'
                              }}
                            />
                          </div>
                        </div>

                        <div style={{ maxHeight: '250px', overflow: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', tableLayout: 'fixed' }}>
                            <thead>
                              <tr style={{ backgroundColor: 'var(--bg-muted)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 1 }}>
                                <th style={{ padding: '10px 12px', width: '100px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '11px' }}>REF</th>
                                <th style={{ padding: '10px 12px', width: '250px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '11px' }}>RISK DESCRIPTION</th>
                                <th style={{ padding: '10px 12px', width: '100px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '11px' }}>TYPE</th>
                                <th style={{ padding: '10px 12px', width: '100px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '11px' }}>NATURE</th>
                                <th style={{ padding: '10px 12px', width: '90px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '11px' }}>FREQ</th>
                                <th style={{ padding: '10px 12px', width: '80px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '11px' }}>STATUS</th>
                                <th style={{ padding: '10px 12px', width: '80px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '11px' }}>SEVERITY</th>
                              </tr>
                            </thead>
                            <tbody>
                              {details.controls
                                ?.filter(ctrl => {
                                  if (!searchQuery) return true;
                                  const q = searchQuery.toLowerCase();
                                  return (
                                    (ctrl.control_ref || '').toLowerCase().includes(q) ||
                                    (ctrl.risk_description || '').toLowerCase().includes(q) ||
                                    (ctrl.control_description || '').toLowerCase().includes(q)
                                  );
                                })
                                .map((ctrl, i) => {
                                  const isCtrlFailed = anyWordIn(ctrl.assessment || '', ["fail", "ineffective", "issue", "weak"]) || anyWordIn(ctrl.gaps || '', ["fail", "ineffective"]);
                                  const ctrlScore = parseFloat(ctrl.risk_score || '0');
                                  const isCtrlHigh = (ctrl.risk_level || '').toUpperCase() === 'HIGH' || ctrlScore >= 70;
                                  
                                  return (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--divider)', hover: { backgroundColor: 'var(--bg-hover)' } }} className="controls-table-row">
                                      <td style={{ padding: '10px 12px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {ctrl.control_ref || `Row ${i}`}
                                      </td>
                                      <td 
                                        style={{ padding: '10px 12px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                        title={ctrl.risk_description || ctrl.control_description}
                                      >
                                        {ctrl.risk_description || ctrl.control_description || '—'}
                                      </td>
                                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                        <span className={`badge ${ctrl.control_classification === 'AUTOMATED' ? 'badge-info' : ctrl.control_classification === 'SEMI-AUTOMATED' ? 'badge-warning' : 'badge-secondary'}`} style={{ padding: '1px 4px', fontSize: '10px' }}>
                                          {ctrl.control_classification || ctrl.control_type || '—'}
                                        </span>
                                      </td>
                                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                                        {ctrl.control_nature || '—'}
                                      </td>
                                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                                        {ctrl.frequency || '—'}
                                      </td>
                                      <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                        <span className={`badge ${isCtrlFailed ? 'badge-danger' : 'badge-success'}`} style={{ padding: '1px 6px', fontSize: '9px', fontWeight: '700' }}>
                                          {isCtrlFailed ? 'FAILED' : 'EFFECTIVE'}
                                        </span>
                                      </td>
                                      <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                        <span className={`badge ${isCtrlHigh ? 'badge-danger' : ctrlScore >= 40 ? 'badge-warning' : 'badge-success'}`} style={{ padding: '1px 6px', fontSize: '9px', fontWeight: '700' }}>
                                          {ctrl.risk_level || (ctrlScore >= 70 ? 'HIGH' : ctrlScore >= 40 ? 'MEDIUM' : 'LOW')}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      Failed to load details for this process.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Styled JSX for the modern premium feel, micro-animations, and full dark-theme compatibility */}
      <style dangerouslySetInnerHTML={{__html: `
        .top-risks-card {
          margin-top: 16px;
          border-radius: 18px;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          transition: all 0.3s ease;
        }
        
        .risk-accordion-item:hover {
          border-color: var(--border-strong) !important;
          transform: translateY(-1px);
        }
        .risk-accordion-item.expanded:hover {
          transform: none;
        }

        .risk-accordion-header:hover {
          background: rgba(22, 119, 255, 0.015);
        }

        .score-critical { color: var(--danger); text-shadow: 0 0 12px rgba(239, 68, 68, 0.15); }
        .score-high { color: #EA580C; }
        .score-medium { color: var(--warning); }
        .score-low { color: var(--success); }

        .badge-critical { background: var(--danger-light); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.1); }
        .badge-high { background: #FFEDD5; color: #C2410C; border: 1px solid rgba(249, 115, 22, 0.1); }
        .badge-medium { background: var(--warning-light); color: #B45309; border: 1px solid rgba(245, 158, 11, 0.1); }
        .badge-low { background: var(--success-light); color: var(--accent-teal); border: 1px solid rgba(34, 197, 94, 0.1); }

        .priority-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          font-size: 10px;
          font-weight: 700;
          border-radius: 20px;
          letter-spacing: 0.5px;
        }

        .risk-indicator-tile {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 12px;
          background: var(--bg-muted);
          border: 1px solid var(--border);
          border-radius: 8px;
          transition: all 0.2s ease;
        }
        .risk-indicator-tile:hover {
          border-color: var(--border-strong);
          background: var(--bg-card);
        }
        .tile-label {
          font-size: 10px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 4px;
          text-align: center;
        }
        .tile-val {
          font-size: 18px;
          font-weight: 800;
          color: var(--text-primary);
        }
        .text-red { color: var(--danger) !important; }
        .text-orange { color: var(--warning) !important; }
        .text-green { color: var(--success) !important; }

        .controls-table-row:hover {
          background-color: var(--bg-hover) !important;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}} />
    </div>
  );
};

// Simple utility to check word matches
const anyWordIn = (str, wordList) => {
  const s = String(str).toLowerCase();
  return wordList.some(w => s.includes(w));
};

export default TopRisksPanel;
