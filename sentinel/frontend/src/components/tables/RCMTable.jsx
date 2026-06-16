import React, { useState, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { Search, Download, RefreshCw, TableProperties } from 'lucide-react';
import { useData } from '../../context/DataContext';
import InsightCard from '../dashboard/InsightCard';

/* ── badge renderer for assessment / gap columns ─────────────────────── */
const StatusRenderer = (props) => {
  const val = props.value || '';
  const isNeg = /gap|fail|ineffective|issue|weak/i.test(val);
  const isPos = /effective|pass|adequate|satisf/i.test(val);
  if (!val) return <span style={{ color: '#94A3B8' }}>—</span>;
  if (isNeg) return <span className="badge badge-danger">{val}</span>;
  if (isPos) return <span className="badge badge-success">{val}</span>;
  return <span>{val}</span>;
};

/* ── long-text tooltip renderer ─────────────────────────────────────── */
const TooltipRenderer = (props) => {
  const val = props.value || '';
  if (!val) return <span style={{ color: '#94A3B8' }}>—</span>;
  const short = val.length > 80 ? val.substring(0, 78) + '…' : val;
  return <span title={val} style={{ cursor: 'help' }}>{short}</span>;
};

const RCMTable = () => {
  const { appData } = useData();
  const [gridApi,    setGridApi]    = useState(null);
  const [searchText, setSearchText] = useState('');
  const [insight, setInsight] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);

  const { rows = [], columns = [] } = appData;
  const hasData = rows.length > 0 && columns.length > 0;

  const handleAnalyzeControl = useCallback(async (rowData) => {
    setInsightLoading(true);
    setInsight(null);
    try {
      const res = await fetch('/api/analyze-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ control_data: rowData })
      });
      const data = await res.json();
      if (data.success) {
        setInsight(data.insight);
      } else {
        console.error(data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setInsightLoading(false);
    }
  }, []);

  /* ── Action button cell renderer ────────────────────────────────── */
  const ActionRenderer = useCallback((props) => {
    return (
      <button 
        onClick={() => handleAnalyzeControl(props.data)}
        className="btn btn-sm btn-primary"
        style={{ padding: '0 8px', height: '28px', gap: '4px', marginTop: '8px' }}
      >
        <Search size={12} /> Analyze
      </button>
    );
  }, [handleAnalyzeControl]);

  /* ── Dynamic column definitions ─────────────────────────────────── */
  const columnDefs = useMemo(() => {
    if (!hasData) return [];

    const ASSESSMENT_KEYS = /assessment|result|design|effectiveness/i;
    const LONG_TEXT_KEYS  = /description|activity|risk|gaps|remarks|others|rationale/i;
    const NARROW_KEYS     = /ref|no|type|nature|freq|class|attrib|data/i;

    const defs = columns.map((col, idx) => {
      const isAssess  = ASSESSMENT_KEYS.test(col);
      const isLong    = LONG_TEXT_KEYS.test(col);
      const isNarrow  = NARROW_KEYS.test(col);
      const isPinned  = idx === 0;          // pin first column

      const def = {
        field:      col,
        headerName: col,
        sortable:   true,
        filter:     true,
        resizable:  true,
        pinned:     isPinned ? 'left' : undefined,
        width:      isNarrow ? 130 : isLong ? 280 : 160,
        cellRenderer: isAssess ? StatusRenderer : isLong ? TooltipRenderer : undefined,
      };

      if (isPinned) {
        def.checkboxSelection      = true;
        def.headerCheckboxSelection = true;
        def.width                   = 160;
      }

      return def;
    });

    // Add action column at the end
    defs.push({
      headerName: "Analysis",
      pinned: "right",
      width: 110,
      cellRenderer: ActionRenderer,
      sortable: false,
      filter: false
    });

    return defs;
  }, [columns, hasData, ActionRenderer]);

  const defaultColDef = useMemo(() => ({
    sortable:   true,
    filter:     true,
    resizable:  true,
    suppressHeaderMenuButton: false,
  }), []);

  const onGridReady = useCallback((params) => setGridApi(params.api), []);

  const handleSearch = (e) => {
    const v = e.target.value;
    setSearchText(v);
    gridApi?.setGridOption('quickFilterText', v);
  };

  const handleExport = () => {
    gridApi?.exportDataAsCsv({ fileName: 'sentinel_controls_export.csv' });
  };

  const handleReset = () => {
    setSearchText('');
    gridApi?.setGridOption('quickFilterText', '');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Dynamic Insight Card Container */}
      {(insightLoading || insight) && (
        <InsightCard insight={insight} loading={insightLoading} />
      )}

      <div className="card" style={{ padding: '14px', gap: '12px' }}>
        {/* Header row */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                      flexWrap:'wrap', gap:'10px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom: '12px' }}>
            <TableProperties size={16} style={{ color:'var(--primary-blue)', marginBottom: '16px' }} />
            <h2 className="title" style={{ margin: 0, display: 'inline-block' }}>
              Risk Control <span>Matrix</span>
            </h2>
            {hasData && (
              <span style={{ fontSize:'11px', color:'var(--text-muted)',
                            backgroundColor:'rgba(255,255,255,0.06)', padding:'3px 8px', borderRadius:'12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px', marginLeft: '6px' }}>
                {rows.length} controls · {columns.length} columns
              </span>
            )}
          </div>

          {hasData && (
            <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
              <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
                <Search size={14} style={{ position:'absolute', left:'8px', color:'var(--text-muted)' }} />
                <input
                  type="text"
                  className="input-text"
                  placeholder="Search all columns…"
                  value={searchText}
                  onChange={handleSearch}
                  style={{ paddingLeft:'28px', width:'220px' }}
                />
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleReset}
                      style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                <RefreshCw size={12} /> Reset
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleExport}
                      style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                <Download size={12} /> Export CSV
              </button>
            </div>
          )}
        </div>

        {/* Grid */}
        {!hasData ? (
          <div style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)', fontSize:'13px',
                        border:'1px dashed var(--card-border)', borderRadius:'4px', backgroundColor:'#FAFBFC' }}>
            <TableProperties size={32} style={{ marginBottom:'8px', opacity:0.3 }} />
            <div>Upload a Controls Excel or CSV file to load the table</div>
          </div>
        ) : (
          <div className="ag-theme-alpine" style={{ height: '560px' }}>
            <AgGridReact
              theme="legacy"
              rowHeight={48}
              headerHeight={44}
              rowData={rows}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              onGridReady={onGridReady}
              pagination={true}
              paginationPageSize={20}
              paginationPageSizeSelector={[10, 20, 50, 100]}
              rowSelection={{ mode: 'multiRow' }}
              suppressRowClickSelection={true}
              animateRows={false}
              enableCellTextSelection={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default RCMTable;
