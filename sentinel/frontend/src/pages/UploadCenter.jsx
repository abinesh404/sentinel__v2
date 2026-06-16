import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  ArrowRight, 
  AlertCircle,
  Loader2,
  Eye,
  Shield,
  Layers,
  Database,
  Check,
  Trash2,
  FolderX
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import AnimatedBackground from '../components/dashboard/AnimatedBackground';

const UploadCenter = () => {
  const navigate = useNavigate();
  const { appData, loadData, setLoading, setError } = useData();
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(appData.status === 'ready');
  const [uploadError, setUploadError] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // State to track preview for a specific historical file
  const [previewFile, setPreviewFile] = useState(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/list-files?tenant_id=CJSJ');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error("Failed to fetch upload history from server:", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [appData.filename]);

  const runAnalysis = async (file) => {
    setAnalyzing(true);
    setUploadError(null);
    setLoading();

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        let errData = {};
        try { errData = JSON.parse(text); } catch (e) { console.error("Invalid error JSON:", text); }
        const errMsg = errData.validationErrors ? errData.validationErrors.join(', ') : (errData.error || 'Failed to upload file');
        throw new Error(errMsg);
      }

      const result = await response.json();
      
      // Load into application context
      loadData(result);
      setAnalyzing(false);
      setAnalyzed(true);

      // Reload history from server to update list
      fetchHistory();
    } catch (err) {
      console.error(err);
      setError(err.message);
      setAnalyzing(false);
      setUploadError(err.message);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setAnalyzed(false);
      setUploadError(null);
      runAnalysis(file);
      // Reset input value to allow selecting the same file again
      e.target.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setAnalyzed(false);
      setUploadError(null);
      runAnalysis(file);
    }
  };

  const handleSelectHistoryItem = async (item) => {
    setAnalyzing(true);
    setUploadError(null);
    setLoading();

    try {
      const response = await fetch('/api/select-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: item.filename,
          tenant_id: 'CJSJ',
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        let errData = {};
        try { errData = JSON.parse(text); } catch (e) { console.error("Invalid error JSON:", text); }
        const errMsg = errData.validationErrors ? errData.validationErrors.join(', ') : (errData.error || 'Failed to select file');
        throw new Error(errMsg);
      }

      const result = await response.json();
      
      // Load into application context
      loadData(result);
      setAnalyzing(false);
      setAnalyzed(true);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setAnalyzing(false);
      setUploadError(err.message);
    }
  };

  const handleDeleteHistoryItem = async (e, filename) => {
    e.stopPropagation(); // Prevent selecting the deleted row
    if (window.confirm(`Are you sure you want to delete ${filename}?`)) {
      try {
        const response = await fetch('/api/delete-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: filename,
            tenant_id: 'CJSJ',
          }),
        });

        if (response.ok) {
          if (appData.filename === filename) {
            loadData({
              filename: null,
              totalRows: 0,
              columns: [],
              rows: [],
              status: 'empty'
            });
            setAnalyzed(false);
            setSelectedFile(null);
          }
          fetchHistory();
        } else {
          alert("Failed to delete file from server");
        }
      } catch (err) {
        console.error("Error deleting file:", err);
      }
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm("Are you sure you want to clear all uploaded documents?")) {
      for (const item of history) {
        try {
          await fetch('/api/delete-file', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filename: item.filename,
              tenant_id: 'CJSJ',
            }),
          });
        } catch (e) {
          console.error(e);
        }
      }
      loadData({
        filename: null,
        totalRows: 0,
        columns: [],
        rows: [],
        status: 'empty'
      });
      setAnalyzed(false);
      setSelectedFile(null);
      fetchHistory();
    }
  };

  const handleOpenPreview = async (item) => {
    setShowPreview(true);
    setPreviewFile({ filename: item.filename, loading: true });
    try {
      const res = await fetch(`/api/preview-file?filename=${encodeURIComponent(item.filename)}&tenant_id=CJSJ`);
      if (res.ok) {
        const data = await res.json();
        setPreviewFile({
          filename: item.filename,
          columns: data.columns || [],
          rows: data.rows || [],
          loading: false
        });
      } else {
        const errData = await res.json().catch(() => ({}));
        setPreviewFile({
          filename: item.filename,
          columns: [],
          rows: [],
          error: errData.error || "Failed to load preview data from server.",
          loading: false
        });
      }
    } catch (e) {
      console.error("Error loading preview:", e);
      setPreviewFile({
        filename: item.filename,
        columns: [],
        rows: [],
        error: "Error loading preview data.",
        loading: false
      });
    }
  };

  const activeRcmFilename = selectedFile?.name || appData.filename;

  // Header design elements
  const iconContainerStyle = {
    width: '58px',
    height: '58px',
    borderRadius: '18px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    flexShrink: 0,
    position: 'relative',
  };

  const headerTitleStyle = {
    fontSize: '30px',
    fontWeight: '800',
    margin: 0,
    letterSpacing: '-1px',
    fontFamily: "'Inter', sans-serif",
    background: 'var(--page-title-gradient)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };

  return (
    <div className="main-content upload-page-wrapper" style={{ position: 'relative', minHeight: '100vh', overflowX: 'hidden' }}>
      <AnimatedBackground />

      {/* Page Header */}
      <div style={{
        margin: '28px 28px 0 28px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '20px',
        position: 'relative',
        zIndex: 1,
        paddingBottom: '22px',
        borderBottom: '2px solid rgba(148, 163, 184, 0.08)',
      }}>
        <div style={iconContainerStyle}>
          <Upload size={30} style={{ color: 'white' }} />
          <div style={{
            position: 'absolute',
            top: '-3px',
            right: '-3px',
            width: '9px',
            height: '9px',
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
          }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <h1 style={headerTitleStyle}>
            AI Upload Center & Parser
          </h1>
          <p style={{ margin: 0, fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.6', fontWeight: '500' }}>
            Upload your Risk Control Matrix (RCM), Past Audits, Standard Operating Procedures (SOP), or Compliance Reports as spreadsheets or CSV files.<br />
            Our parser maps headers dynamically and indexes controls into your active workspace.
          </p>
        </div>


      </div>

      {/* Grid Container */}
      <div style={{
        padding: '28px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
        gap: '28px',
        position: 'relative',
        zIndex: 1
      }}>
        
        {/* Left Card: File Drag & Drop / Analyzing */}
        <div className="card" style={{
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: '440px',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}>
          {/* Top accent line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.4) 30%, rgba(99, 102, 241, 0.6) 50%, rgba(16, 185, 129, 0.4) 70%, transparent)',
          }} />

          {analyzing ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: '26px',
              padding: '30px 10px'
            }}>
              {/* Spinner animation */}
              <div style={{
                position: 'relative',
                width: '84px',
                height: '84px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  border: '3px solid rgba(45, 212, 191, 0.1)',
                  borderTop: '3px solid #2dd4bf',
                  animation: 'spin 1s linear infinite'
                }} />
                <div style={{
                  position: 'absolute',
                  width: '70%',
                  height: '70%',
                  borderRadius: '50%',
                  border: '3px solid rgba(139, 92, 246, 0.1)',
                  borderBottom: '3px solid #8b5cf6',
                  animation: 'spin-reverse 1.4s linear infinite'
                }} />
                <FileSpreadsheet size={30} style={{ color: '#2dd4bf', filter: 'drop-shadow(0 0 10px rgba(45, 212, 191, 0.4))' }} />
              </div>

              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#f1f5f9', marginBottom: '8px' }}>
                  Processing & Analyzing File...
                </h3>
                <p style={{ fontSize: '14px', color: '#94a3b8', maxWidth: '340px', margin: '0 auto', lineHeight: '1.6', fontWeight: '500' }}>
                  The AI parser is matching column layouts, mapping control taxonomies, and indexing your database.
                </p>
              </div>

              {/* Progress bar */}
              <div style={{
                width: '260px',
                height: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '3px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div className="progress-bar-fill" />
              </div>

              {/* Steps ticker */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '300px', fontSize: '13px', color: '#64748b' }}>
                <div className="status-step active">• Validating file signature & structure</div>
                <div className="status-step active">• Extracting header cells & mapping schema</div>
                <div className="status-step">• Running risk taxonomy mapping (NLP)</div>
              </div>
            </div>
          ) : (
            <label 
              htmlFor="file-upload"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${analyzed ? 'rgba(45, 212, 191, 0.4)' : isDragging ? 'rgba(129, 140, 248, 0.8)' : 'rgba(255, 255, 255, 0.08)'}`,
                borderRadius: '18px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '52px 28px',
                backgroundColor: analyzed ? 'rgba(45, 212, 191, 0.02)' : isDragging ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255, 255, 255, 0.01)',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isDragging ? '0 0 30px rgba(99, 102, 241, 0.15)' : 'none',
              }}
              className="upload-dropzone"
            >
              <input 
                id="file-upload" 
                ref={fileInputRef}
                type="file" 
                style={{ display: 'none' }} 
                onChange={handleFileChange}
                accept=".xlsx,.xls,.csv"
              />
              
              {/* Dynamic Glow Icon */}
              <div className={`glow-icon ${analyzed ? 'success' : isDragging ? 'active' : ''}`} style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                backgroundColor: analyzed ? 'rgba(45, 212, 191, 0.08)' : 'rgba(99, 102, 241, 0.08)',
                color: analyzed ? '#2dd4bf' : '#818cf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '22px',
                transition: 'all 0.25s ease'
              }}>
                {analyzed ? <CheckCircle size={36} /> : <Upload size={36} />}
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, textAlign: 'center' }}>
                {analyzed 
                  ? `File Loaded Successfully` 
                  : selectedFile 
                    ? selectedFile.name 
                    : 'Drag & Drop File Here'}
              </h3>
              
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginTop: '8px', textAlign: 'center', maxWidth: '340px', lineHeight: '1.5', fontWeight: '500' }}>
                {analyzed 
                  ? `${activeRcmFilename}`
                  : 'Select a spreadsheet (XLSX, XLS, CSV) for RCM, past audits, standard operating procedures, or compliance reports.'}
              </p>

              {analyzed && (
                <div style={{
                  marginTop: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12.5px',
                  color: '#2dd4bf',
                  background: 'rgba(45, 212, 191, 0.08)',
                  padding: '5px 12px',
                  borderRadius: '12px',
                  fontWeight: '600'
                }}>
                  <Check size={14} /> {appData.totalRows} Control Activities Indexed
                </div>
              )}

              <div className="btn-upload-action" style={{
                marginTop: '26px',
                padding: '10px 24px',
                borderRadius: '30px',
                background: analyzed ? 'rgba(255, 255, 255, 0.06)' : 'linear-gradient(135deg, #6366f1, #818cf8)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: analyzed ? 'none' : '0 4px 15px rgba(99, 102, 241, 0.25)',
                transition: 'all 0.2s ease'
              }}>
                {analyzed ? 'Upload Different File' : selectedFile ? 'Change Selected File' : 'Browse System Files'}
              </div>
            </label>
          )}
        </div>

        {/* Right Card: Workspace Documents Library List */}
        <div className="card" style={{
          padding: '26px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '440px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Top accent line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3) 30%, rgba(99, 102, 241, 0.5) 50%, rgba(45, 212, 191, 0.3) 70%, transparent)',
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
            {/* Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)', 
              borderBottom: '1px solid var(--border)', 
              paddingBottom: '14px',
              marginBottom: '18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={18} style={{ color: '#818cf8' }} />
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Workspace Documents</h3>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ 
                  fontSize: '12px', 
                  color: '#2dd4bf', 
                  background: 'rgba(45, 212, 191, 0.08)',
                  padding: '3px 10px',
                  borderRadius: '10px',
                  fontWeight: '600'
                }}>
                  {history.length} {history.length === 1 ? 'file' : 'files'}
                </span>
                
                {history.length > 0 && (
                  <button 
                    onClick={handleClearHistory}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: '#64748b',
                      padding: '4px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                    title="Clear Upload History"
                  >
                    <FolderX size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Error message */}
            {uploadError && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 14px',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.04)',
                color: '#f87171',
                fontSize: '13.5px',
                lineHeight: '1.5',
                marginBottom: '14px'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Scrollable Document List */}
            <div className="documents-list-container" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px', 
              flex: 1, 
              overflowY: 'auto',
              maxHeight: '230px',
              paddingRight: '4px'
            }}>
              {history.length > 0 ? (
                history.map((item) => {
                  const isActive = appData.filename === item.filename;
                  return (
                    <div 
                      key={item.filename}
                      onClick={() => handleSelectHistoryItem(item)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        border: `1px solid ${isActive ? 'rgba(45, 212, 191, 0.25)' : 'var(--border)'}`,
                        borderRadius: '12px',
                        background: isActive ? 'rgba(45, 212, 191, 0.03)' : 'var(--surface-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = isActive ? 'rgba(45, 212, 191, 0.4)' : 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.background = isActive ? 'rgba(45, 212, 191, 0.05)' : 'var(--surface-muted)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = isActive ? 'rgba(45, 212, 191, 0.25)' : 'var(--border)';
                        e.currentTarget.style.background = isActive ? 'rgba(45, 212, 191, 0.03)' : 'var(--surface-muted)';
                      }}
                    >
                      {/* Active indicator dot */}
                      {isActive && (
                        <div style={{
                          position: 'absolute',
                          left: '0',
                          top: '12px',
                          bottom: '12px',
                          width: '3px',
                          borderRadius: '0 4px 4px 0',
                          backgroundColor: '#2dd4bf',
                          boxShadow: '0 0 10px #2dd4bf'
                        }} />
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1, paddingLeft: isActive ? '4px' : '0' }}>
                        <div style={{
                          color: isActive ? '#10b981' : '#64748b',
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          backgroundColor: isActive ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-card)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <FileSpreadsheet size={20} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ 
                            fontSize: '16px', 
                            fontWeight: '600', 
                            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', 
                            display: 'block', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap' 
                          }}>
                            {item.filename}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                            <span>{item.totalRows} rows</span>
                            <span>•</span>
                            <span>{new Date(item.uploadedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Interactive Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '10px' }} onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => handleOpenPreview(item)}
                          style={{
                            border: '1px solid rgba(45, 212, 191, 0.3)',
                            background: 'rgba(45, 212, 191, 0.06)',
                            cursor: 'pointer',
                            color: '#2dd4bf',
                            padding: '6px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            borderRadius: '16px',
                            fontSize: '12px',
                            fontWeight: '600',
                            transition: 'all 0.2s ease',
                            outline: 'none',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(45, 212, 191, 0.15)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(45, 212, 191, 0.06)'}
                          title="Preview File Content"
                        >
                          <Eye size={13} />
                          Preview
                        </button>

                        <button 
                          onClick={(e) => handleDeleteHistoryItem(e, item.filename)}
                          style={{
                            border: 'none',
                            background: 'rgba(239, 68, 68, 0.08)',
                            cursor: 'pointer',
                            color: '#f87171',
                            padding: '6px 8px',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            outline: 'none',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)';
                            e.currentTarget.style.color = '#ef4444';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                            e.currentTarget.style.color = '#f87171';
                          }}
                          title="Delete File"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ 
                  padding: '50px 20px', 
                  textAlign: 'center', 
                  border: '1px dashed var(--border)', 
                  borderRadius: '16px', 
                  color: '#64748b', 
                  fontSize: '14.5px',
                  background: 'var(--surface-muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <Layers size={28} style={{ opacity: 0.3 }} />
                  <span>No uploaded spreadsheets in history.</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '14px',
            borderTop: '1px solid var(--border)',
            paddingTop: '20px',
            marginTop: '20px'
          }}>
            <button 
              onClick={() => navigate('/dashboard')}
              disabled={!analyzed && appData.status !== 'ready'}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                border: 'none',
                background: (!analyzed && appData.status !== 'ready') ? 'var(--surface-muted)' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                cursor: (!analyzed && appData.status !== 'ready') ? 'not-allowed' : 'pointer',
                color: (!analyzed && appData.status !== 'ready') ? '#6b7280' : '#ffffff',
                padding: '11px 24px',
                borderRadius: '30px',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: (!analyzed && appData.status !== 'ready') ? 'none' : '0 4px 15px rgba(99, 102, 241, 0.3)',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
            >
              Go to Dashboard
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Pop-up Modal for Excel Data Preview */}
      {showPreview && previewFile && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '24px',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '1150px',
            maxHeight: '82vh',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Top accent line */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(45, 212, 191, 0.4) 30%, rgba(99, 102, 241, 0.5) 50%, rgba(45, 212, 191, 0.4) 70%, transparent)',
            }} />

            {/* Modal Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              borderBottom: '1px solid var(--border)', 
              paddingBottom: '14px' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileSpreadsheet style={{ color: '#2dd4bf' }} size={20} />
                <h3 style={{ fontSize: '17px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                  Excel Data Preview: <span style={{ color: '#2dd4bf' }}>{previewFile.filename}</span>
                </h3>
              </div>
              <button 
                onClick={() => setShowPreview(false)}
                style={{
                  border: 'none',
                  background: 'var(--surface-muted)',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  fontSize: '12px',
                  fontWeight: '700',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                  e.currentTarget.style.color = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--surface-muted)';
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >
                ✕
              </button>
            </div>
            
            {/* Scrollable Table Viewport */}
            <div className="custom-modal-table-viewport" style={{ 
              overflow: 'auto', 
              flex: 1, 
              border: '1px solid var(--border)', 
              borderRadius: '12px',
              background: 'var(--surface-muted)',
              display: (previewFile.loading || previewFile.error) ? 'flex' : 'block',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '200px'
            }}>
              {previewFile.loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: '#94a3b8' }}>
                  <Loader2 size={32} style={{ color: '#2dd4bf', animation: 'spin 1s linear infinite' }} />
                  <span>Loading spreadsheet preview...</span>
                </div>
              ) : previewFile.error ? (
                <div style={{ color: '#f87171', padding: '20px', fontWeight: '500' }}>
                  {previewFile.error}
                </div>
              ) : previewFile.rows && previewFile.rows.length > 0 && previewFile.columns && previewFile.columns.length > 0 ? (
                <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left' }}>
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      {previewFile.columns.map((col, cIdx) => (
                        <th key={cIdx} style={{ 
                          padding: '14px 18px', 
                          whiteSpace: 'nowrap', 
                          borderBottom: '1px solid var(--border)', 
                          background: 'var(--bg-card)',
                          color: 'var(--text-secondary)',
                          fontWeight: '700',
                          fontSize: '13px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewFile.rows.map((row, rIdx) => (
                      <tr 
                        key={rIdx} 
                        style={{ 
                          backgroundColor: rIdx % 2 === 0 ? 'transparent' : 'rgba(0, 0, 0, 0.02)',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = rIdx % 2 === 0 ? 'transparent' : 'rgba(0, 0, 0, 0.02)'}
                      >
                        {previewFile.columns.map((col, cIdx) => (
                          <td key={cIdx} style={{ 
                            padding: '14px 18px', 
                            whiteSpace: 'normal', 
                            maxWidth: '320px', 
                            wordBreak: 'break-word',
                            borderBottom: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                            lineHeight: '1.6'
                          }}>
                            {String(row[col] === undefined || row[col] === null ? '' : row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
                  No columns or rows available in active memory to preview.
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              borderTop: '1px solid rgba(255, 255, 255, 0.05)', 
              paddingTop: '14px' 
            }}>
              <button 
                onClick={() => setShowPreview(false)}
                style={{
                  border: 'none',
                  background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  cursor: 'pointer',
                  color: '#ffffff',
                  padding: '10px 26px',
                  borderRadius: '30px',
                  fontSize: '14px',
                  fontWeight: '600',
                  boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled custom scrollbars and keyframes */}
      <style>{`
        .upload-page-wrapper, .upload-page-wrapper * {
          font-family: 'Inter', sans-serif !important;
        }
        .upload-dropzone:hover .glow-icon:not(.success) {
          color: #2dd4bf !important;
          background-color: rgba(45, 212, 191, 0.08) !important;
          transform: scale(1.05);
        }
        .upload-dropzone:hover .btn-upload-action {
          background: linear-gradient(135deg, #4f46e5, #6366f1) !important;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4) !important;
        }
        .glow-icon.active {
          box-shadow: 0 0 20px rgba(129, 140, 248, 0.4);
        }
        .glow-icon.success {
          box-shadow: 0 0 20px rgba(45, 212, 191, 0.4);
        }
        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #2dd4bf, #8b5cf6);
          border-radius: 3px;
          animation: progressBarMove 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .status-step {
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.3s;
        }
        .status-step.active {
          color: #2dd4bf;
          font-weight: 500;
        }
        /* Custom Scrollbar for Modal Table & List */
        .custom-modal-table-viewport::-webkit-scrollbar,
        .documents-list-container::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-modal-table-viewport::-webkit-scrollbar-track,
        .documents-list-container::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.01);
        }
        .custom-modal-table-viewport::-webkit-scrollbar-thumb,
        .documents-list-container::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 4px;
        }
        .custom-modal-table-viewport::-webkit-scrollbar-thumb:hover,
        .documents-list-container::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes progressBarMove {
          0% { width: 10%; transform: translateX(-10%); }
          50% { width: 40%; transform: translateX(120%); }
          100% { width: 10%; transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
};

export default UploadCenter;
