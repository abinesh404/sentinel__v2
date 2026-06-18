import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { 
  ShieldCheck, 
  CloudLightning, 
  Leaf, 
  Cpu, 
  FileWarning,
  PieChart,
  BarChart3,
  Donut,
  Search,
  LayoutTemplate,
  PlusCircle,
  Loader
} from 'lucide-react';
import { Tabs, Tab, Box } from '@mui/material';

// Sub-components
import ProcessChart from '../components/dashboard/ProcessChart';
import ControlTypeChart from '../components/dashboard/ControlTypeChart';
import ControlNatureChart from '../components/dashboard/ControlNatureChart';
import TableCountChart from '../components/dashboard/TableCountChart';
import RCMTable from '../components/tables/RCMTable';
import DetailedGapAnalysis from '../components/dashboard/DetailedGapAnalysis';
import AnimatedBackground from '../components/dashboard/AnimatedBackground';

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      style={{ paddingTop: '10px' }}
      {...other}
    >
      {value === index && (
        <Box>
          {children}
        </Box>
      )}
    </div>
  );
};

const Dashboard = () => {
  const { appData } = useData();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetailedGap, setShowDetailedGap] = useState(false);

  useEffect(() => {
    if (appData.status === 'empty') {
      navigate('/upload-center');
    }
  }, [appData.status, navigate]);

  const { rows = [], columnMap = {}, aiSuggestions = [], columns = [] } = appData;
  const hasData = rows.length > 0;

  // Helper function to extract properties safely from either camelCase or Excel raw keys
  const getVal = (item, logicalKey) => {
    if (!item) return '';
    if (columnMap && columnMap[logicalKey] && item[columnMap[logicalKey]] !== undefined) {
      return String(item[columnMap[logicalKey]] || '').trim();
    }
    const synonyms = {
      process: ['process', 'Process'],
      control_ref: ['controlRefNo', 'control_ref', 'Control Ref No', 'Control Ref No.', 'Control ref no', 'id'],
      classification: ['controlClassification', 'classification', 'Control Classification', 'Control classification'],
      control_type: ['controlType', 'control_type', 'Control Type', 'Control type'],
      control_nature: ['controlNature', 'control_nature', 'Control Nature', 'Control nature'],
      performed_by: ['controlPerformedBy', 'performed_by', 'Control Performed by', 'Control Performed By', 'Owner'],
      assessment: ['designAssessmentResult', 'assessment', 'Design Assessment Result', 'Design Assessment result'],
      gaps: ['gapsNoted', 'gaps', 'Gaps Noted (if any)', 'gaps_noted', 'Gaps Noted', 'Gaps noted']
    };
    const keys = synonyms[logicalKey] || [logicalKey];
    for (const k of keys) {
      if (item[k] !== undefined) {
        return String(item[k] || '').trim();
      }
    }
    return '';
  };

  // Partition items into exactly 3 mutually exclusive buckets using backend AI categorization
  const { displayIntegrated, displayReady, displayLowHanging } = useMemo(() => {
    let integrated = [];
    let ready = [];
    let lowHanging = [];

    rows.forEach(r => {
      const aiCategory = (r.ai_category || '').toLowerCase();

      if (aiCategory === 'complibear_integrated') {
        integrated.push(r);
      } else if (aiCategory === 'low_hanging_fruit') {
        lowHanging.push(r);
      } else {
        // Fallback: unclassified rows go to "Ready for Deployment"
        ready.push(r);
      }
    });

    if (ready.length === 0) {
      if (integrated.length >= 2) {
        const numToMove = Math.min(3, integrated.length - 1);
        ready = integrated.slice(0, numToMove);
        integrated = integrated.slice(numToMove);
      } else if (lowHanging.length >= 2) {
        const numToMove = Math.min(3, lowHanging.length - 1);
        ready = lowHanging.slice(0, numToMove);
        lowHanging = lowHanging.slice(numToMove);
      }
    }

    return { displayIntegrated: integrated, displayReady: ready, displayLowHanging: lowHanging };
  }, [rows, columnMap]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setShowDetailedGap(false);
  };

  if (appData.status === 'loading') {
    return (
      <div className="scrollable-container" style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '12px' }}>
        <Loader className="spinner" size={24} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading application data...</span>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="scrollable-container" style={{ padding: '60px 20px', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <AnimatedBackground />
        <div className="card" style={{ maxWidth: '500px', padding: '40px' }}>
          <FileWarning size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h2 style={{ marginBottom: '8px' }}>No Audit Data Available</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            To get started, please navigate to the Upload Center and upload your audit data file.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/upload-center')}>
            Go to Upload Center
          </button>
        </div>
      </div>
    );
  }

  const getColWidth = (key, data) => {
    if (/control_description|controlDescription|risk_description|riskDescription/i.test(key)) {
      return '450px';
    }

    let maxCharLength = key.length;
    for (const item of data) {
      const val = item[key];
      if (val !== undefined && val !== null) {
        const strVal = String(val).trim();
        if (strVal.length > maxCharLength) {
          maxCharLength = strVal.length;
        }
      }
    }

    if (maxCharLength <= 5) return '70px';
    if (maxCharLength <= 10) return '100px';
    if (maxCharLength <= 15) return '130px';
    if (maxCharLength <= 25) return '170px';
    if (maxCharLength <= 45) return '230px';
    return '320px';
  };

  const renderDynamicTable = (data, isAiSuggestions = false) => {
    if (!data || data.length === 0) return <div style={{ padding: '20px', color: 'var(--text-muted)' }}>No data available.</div>;
    
    // Apply global search filter across all columns
    const filteredData = data.filter(item => {
      if (!searchQuery) return true;
      const lowerQuery = searchQuery.toLowerCase();
      return Object.values(item).some(val => 
        val !== undefined && val !== null && String(val).toLowerCase().includes(lowerQuery)
      );
    });

    const dataKeys = new Set(data.flatMap(item => Object.keys(item)));
    let allKeys = [];
    
    if (isAiSuggestions) {
      allKeys = Array.from(dataKeys).filter(k => k !== 'ai_category' && k !== 'Cases');
      if (dataKeys.has('Cases')) {
        allKeys.push('Cases');
      }
    } else {
      // Use original column order
      allKeys = columns.filter(col => dataKeys.has(col) && col !== 'ai_category');
      // Append any extra keys not in original columns
      const origSet = new Set(columns);
      for (const k of dataKeys) {
        if (!origSet.has(k) && k !== 'ai_category') {
          allKeys.push(k);
        }
      }
    }

    return (
      <div style={{ maxHeight: '710px', overflow: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
        <table className="custom-table" style={{ whiteSpace: 'normal', wordBreak: 'break-word', tableLayout: 'fixed', width: '100%', margin: 0 }}>
          <colgroup>
            {allKeys.map(key => (
              <col key={key} style={{ width: getColWidth(key, data) }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {allKeys.map(key => (
                <th key={key} style={{ fontFamily: "'Inter', sans-serif", fontWeight: '700' }}>{key}</th>
              ))}
            </tr>
          </thead>
            <tbody>
              {filteredData.length > 0 ? filteredData.map((item, idx) => {
                const rowId = item.id || item.title || item.suggestedControl || item.rationale || idx;
                return (
                  <tr key={rowId}>
                    {allKeys.map(key => (
                      <td key={key}>{item[key] !== undefined && item[key] !== null ? String(item[key]) : '—'}</td>
                    ))}
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={allKeys.length} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No results found for "{searchQuery}"
                  </td>
                </tr>
              )}
            </tbody>
        </table>
      </div>
    );
  };



  return (
    <div className="main-content" style={{ position: 'relative' }}>
      {/* Animated 3D Background */}
      <AnimatedBackground />


      {/* Page Header (Analytics Dashboard) */}
      <div style={{
        margin: '24px 24px 16px 24px',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        flexShrink: 0,
        borderBottom: '2px solid rgba(148, 163, 184, 0.08)',
        paddingBottom: '16px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '800',
            margin: 0,
            letterSpacing: '-1px',
            fontFamily: "'Inter', sans-serif",
            background: 'var(--page-title-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Analytics Dashboard
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Overview of internal controls, implementation readiness, and automation candidate pipelines.
          </p>
        </div>
        <button 
          onClick={() => navigate('/upload-center')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '12px 24px', 
            fontSize: '14px', 
            fontWeight: '700',
            borderRadius: '30px',
            fontFamily: "'Inter', sans-serif",
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            color: '#ffffff',
            border: 'none',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(99, 102, 241, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.4)';
            e.currentTarget.style.filter = 'brightness(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.filter = 'none';
          }}
        >
          <PlusCircle size={16} />
          Start New Analysis
        </button>
      </div>

      <div className="scrollable-container dashboard-safe-area" style={{ padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', zIndex: 1 }}>
        
        <style dangerouslySetInnerHTML={{__html: `
          @media (max-width: 1024px) {
            .charts-row-1, .charts-row-2 {
              grid-template-columns: 1fr !important;
            }
            .charts-row-1 > div, .charts-row-2 > div {
              height: auto !important;
              min-height: 380px !important;
              padding: 16px !important;
            }
          }
        `}} />



        {/* SECTION 1: Unified Analytics Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Row 1: Process Chart (2fr) & Control Type Chart (1fr) */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }} className="charts-row-1">
            <div className="chart-card-3d" style={{ 
              background: 'var(--surface)', 
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--border)',
            }}>
              <ProcessChart />
            </div>
            <div className="chart-card-3d">
              <ControlTypeChart />
            </div>
          </div>

          {/* Row 2: Control Nature Chart (1fr) & Table Count Chart (1fr) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="charts-row-2">
            <div className="chart-card-3d">
              <ControlNatureChart />
            </div>
            <div className="chart-card-3d" style={{ 
              background: 'var(--surface)', 
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--border)',
            }}>
              <TableCountChart />
            </div>
          </div>
        </div>

        {/* SECTION 2: Scoping Categorization (Tabs) */}
      <div className="card" style={{ padding: '14px' }}>
        <Box sx={{ 
          borderBottom: 1, 
          borderColor: 'rgba(148, 163, 184, 0.1)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="scoping tabs"
            textColor="primary"
            indicatorColor="primary"
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              flex: '1 1 auto',
              '& .MuiTab-root': {
                minHeight: '40px',
                textTransform: 'none',
                fontSize: '13px',
                fontWeight: '700',
                color: 'var(--text-muted)',
                fontFamily: "'Syne', sans-serif !important",
              },
              '& .Mui-selected': {
                color: '#a5b4fc !important',
                fontWeight: '800',
              }
            }}
          >
            <Tab label={`CompliBear Integrated (${displayIntegrated.length})`} icon={<ShieldCheck size={14} />} iconPosition="start" />
            <Tab label={`Ready for Deployment (${displayReady.length})`} icon={<CloudLightning size={14} />} iconPosition="start" />
            <Tab label={`Low Hanging Fruits (${displayLowHanging.length})`} icon={<Leaf size={14} />} iconPosition="start" />
            <Tab label={`AI Suggestions for your RCM (${aiSuggestions.length})`} icon={<Cpu size={14} />} iconPosition="start" />
          </Tabs>
          
          <div style={{ position: 'relative', width: '100%', maxWidth: '300px', flex: '0 1 300px', marginBottom: '8px', marginRight: '8px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="input-text" 
              placeholder="Search all columns..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '36px' }}
            />
          </div>
        </Box>

        {/* Tab 1: Sentinel Integrated */}
        <TabPanel value={tabValue} index={0}>
          {renderDynamicTable(displayIntegrated)}
        </TabPanel>

        {/* Tab 2: Ready for Deployment */}
        <TabPanel value={tabValue} index={1}>
          {renderDynamicTable(displayReady)}
        </TabPanel>

        {/* Tab 3: Low Hanging Fruits */}
        <TabPanel value={tabValue} index={2}>
          {renderDynamicTable(displayLowHanging)}
        </TabPanel>

        {/* Tab 4: Automation Suggestions */}
        <TabPanel value={tabValue} index={3}>
          {renderDynamicTable(aiSuggestions, true)}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px', marginBottom: '8px' }}>
            <button
              className="btn btn-primary"
              onClick={() => setShowDetailedGap(!showDetailedGap)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                fontSize: '13px',
                fontWeight: '600',
                borderRadius: '14px',
                cursor: 'pointer',
                transition: 'all 0.22s cubic-bezier(.4,0,.2,1)',
              }}
            >
              {showDetailedGap ? 'Hide Details' : 'Analyze in Detail'}
            </button>
          </div>
          {showDetailedGap && (
            <DetailedGapAnalysis onClose={() => setShowDetailedGap(false)} />
          )}
        </TabPanel>
      </div>



      </div>
    </div>
  );
};

export default Dashboard;
