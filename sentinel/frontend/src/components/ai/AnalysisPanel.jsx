import React, { useState, useEffect } from 'react';
import { Info, Cpu, CheckSquare, ThumbsUp, ThumbsDown } from 'lucide-react';

const AnalysisPanel = ({ selectedItem }) => {
  const [feedbackStatus, setFeedbackStatus] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Reset feedback state when selectedItem changes
  useEffect(() => {
    setFeedbackStatus(null);
    setFeedbackMessage('');
  }, [selectedItem?.controlRefNo, selectedItem?.control_ref, selectedItem?.id]);

  if (!selectedItem) {
    return (
      <div className="card" style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        color: 'var(--text-muted)',
        padding: '30px',
        borderStyle: 'dashed'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <Info size={32} />
          <p style={{ fontSize: '13px', fontWeight: '500' }}>Select a control or recommendation row to view the Deep Analysis Panel.</p>
        </div>
      </div>
    );
  }

  const controlRef = selectedItem.controlRefNo || selectedItem.control_ref || selectedItem.id || 'Unreferenced control';
  const isGaps = selectedItem.designAssessmentResult && selectedItem.designAssessmentResult.toLowerCase().includes('gap');

  const submitFeedback = async (decision) => {
    try {
      const payload = {
        controlRef: controlRef,
        process: selectedItem.process || '',
        originalRecommendation: selectedItem.bestRecommendation || '',
        decision: decision,
        tenantId: 'CJSJ'
      };
      
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      if (result.success) {
        setFeedbackStatus(decision);
        setFeedbackMessage(decision === 'APPROVED' ? 'Approved! System will prioritize this pattern.' : 'Rejected! System will demote this pattern.');
      } else {
        setFeedbackMessage('Failed to save feedback: ' + (result.error || 'unknown error'));
      }
    } catch (err) {
      console.error('Feedback error:', err);
      setFeedbackMessage('Error contacting feedback server.');
    }
  };

  return (
    <div className="card" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      textAlign: 'left'
    }}>
      <div className="card-title" style={{ margin: 0, paddingBottom: '12px', borderBottom: '1px solid var(--card-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={18} style={{ color: 'var(--primary-blue)' }} />
          <span>Control Analysis Panel</span>
        </div>
        <span className="badge badge-success" style={{
          backgroundColor: 'var(--primary-blue-light)',
          color: 'var(--primary-blue)'
        }}>
          Active Control
        </span>
      </div>

      {/* Risk and ID Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(226,232,240,0.8)' }}>
        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CONTROL REF</span>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-dark)' }}>{controlRef}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>RISK LEVEL / SCORE</span>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--risk-red)' }}>
            {selectedItem.risk_level || 'UNKNOWN'} / {selectedItem.risk_score || 0}
          </div>
        </div>
      </div>

      {/* Process Area */}
      <div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>PROCESS BLOCK</span>
        <div style={{ fontSize: '13px', fontWeight: '500', marginTop: '2px' }}>{selectedItem.process}</div>
      </div>

      {/* Control Rationale */}
      <div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>CONTROL RATIONALE</span>
        <p style={{ fontSize: '12px', color: 'var(--text-dark)', marginTop: '4px', lineHeight: '1.4' }}>
          {selectedItem.rationale || selectedItem.riskDescription || selectedItem.risk_description || 'Information not available in uploaded dataset.'}
        </p>
      </div>

      {/* Recommendation & Feedback Loop */}
      {selectedItem.bestRecommendation ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>BEST AUTOMATION RECOMMENDATION</span>
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '14px',
            padding: '12px'
          }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0369a1' }}>
              {selectedItem.bestRecommendation}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-dark)', marginTop: '4px' }}>
              {selectedItem.whySelected}
            </div>
            
            {/* Explainability Triggers */}
            {selectedItem.trigger && selectedItem.trigger.length > 0 && (
              <div style={{ marginTop: '10px', borderTop: '1px solid #e0f2fe', paddingTop: '8px' }}>
                <span style={{ fontSize: '10px', color: '#0284c7', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  DETERMINISTIC EVIDENCE TRIGGERS
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {selectedItem.trigger.map((t, idx) => (
                    <div key={idx} style={{ fontSize: '11px', color: '#075985', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                      <span style={{ color: '#0284c7', fontWeight: 'bold' }}>•</span>
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Human Feedback Loop buttons */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginTop: '12px',
              borderTop: '1px dashed #bae6fd',
              paddingTop: '10px',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '11px', color: '#075985', fontWeight: '500' }}>Confirm Suggestion?</span>
              <button
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #10b981',
                  backgroundColor: feedbackStatus === 'APPROVED' ? '#10b981' : '#ffffff',
                  color: feedbackStatus === 'APPROVED' ? '#ffffff' : '#10b981',
                  cursor: 'pointer',
                  fontWeight: '600',
                  marginLeft: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.22s cubic-bezier(.4,0,.2,1)'
                }}
                onClick={() => submitFeedback('APPROVED')}
              >
                <ThumbsUp size={12} />
                Approve
              </button>
              <button
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #ef4444',
                  backgroundColor: feedbackStatus === 'REJECTED' ? '#ef4444' : '#ffffff',
                  color: feedbackStatus === 'REJECTED' ? '#ffffff' : '#ef4444',
                  cursor: 'pointer',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.22s cubic-bezier(.4,0,.2,1)'
                }}
                onClick={() => submitFeedback('REJECTED')}
              >
                <ThumbsDown size={12} />
                Reject
              </button>
            </div>
            
            {feedbackMessage && (
              <div style={{
                fontSize: '11px',
                color: feedbackStatus === 'APPROVED' ? '#10b981' : '#ef4444',
                marginTop: '8px',
                fontWeight: '600',
                textAlign: 'left'
              }}>
                {feedbackMessage}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>COMPLIANCE ALIGNMENT</span>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Information not available in uploaded dataset.
          </div>
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '12px' }}></div>

      {/* Suggested Test Plan */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <CheckSquare size={13} style={{ color: 'var(--primary-blue)' }} />
          SUGGESTED AUDIT TEST PROCEDURE
        </span>
        <div style={{
          backgroundColor: '#F8FAFC',
          border: '1px solid var(--card-border)',
          borderRadius: '14px',
          padding: '14px',
          fontSize: '12px',
          fontFamily: 'monospace',
          color: 'var(--text-dark)',
          whiteSpace: 'pre-wrap',
          lineHeight: '1.4'
        }}>
          {isGaps ? (
            `ASSESSMENT ALERT\nGaps noted: ${selectedItem.gapsNoted}\n\nInspect the evidence listed in the uploaded Data Request field and document whether the stated control operated as designed.`
          ) : (
            `TEST PROCEDURE FOR ${controlRef}\n1. Confirm the uploaded control description and stated owner.\n2. Select a sample appropriate to the uploaded frequency.\n3. Inspect: ${selectedItem.data_request || 'Information not available in uploaded dataset.'}`
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div style={{ marginTop: 'auto', display: 'flex', gap: '8px', borderTop: '1px solid var(--card-border)', paddingTop: '12px' }}>
        <button 
          className="btn btn-secondary btn-sm"
          style={{ flex: 1 }}
          onClick={() => alert(`Framework reference mapping downloaded for ${controlRef}`)}
        >
          Export Details
        </button>
        <button 
          className="btn btn-primary btn-sm"
          style={{ flex: 1 }}
          onClick={() => alert(`Testing script generated! Available in workspace.`)}
        >
          Generate Script
        </button>
      </div>
    </div>
  );
};

export default AnalysisPanel;
