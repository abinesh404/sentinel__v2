import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const [appData, setAppData] = useState({
    status: 'loading',           // 'empty' | 'loading' | 'ready' | 'error'
    filename: null,
    totalRows: 0,
    columns: [],
    columnMap: {},
    rows: [],
    chartData: {
      byProcess:     { labels: [], data: [] },
      byRisk:        { labels: [], data: [] },
      byType:        { labels: [], data: [] },
      byNature:      { labels: [], data: [] },
      topRisks:      { labels: [], data: [] },
      fraudSchemes:  { labels: [], data: [] },
    },
    auditPlan: [],
    aiSuggestions: [],
    classifiedTabs: {
      complibear_integrated: [],
      ready_for_deployment: [],
      low_hanging_fruits: [],
      ai_suggestions: [],
    },
    dataQuality: {},
    kpis: {
      totalControls: 0,
      totalRisks: 0,
      highRisks: 0,
      manualControls: 0,
      automatedControls: 0,
      semiAutomatedControls: 0,
      automationRate: 0,
      processCount: 0,
    },
    error: null,
  });

  // On mount, check if the backend already has data loaded
  useEffect(() => {
    fetch('/api/data')
      .then(async r => {
        const text = await r.text();
        try {
          return JSON.parse(text);
        } catch (e) {
          console.error("Invalid JSON response from /api/data:", text);
          return { status: 'error', error: 'Invalid backend response' };
        }
      })
      .then(data => {
        if (data.status === 'ready') {
          setAppData(prev => ({ ...prev, ...data, status: 'ready', error: null }));
        } else {
          setAppData(prev => ({ ...prev, status: 'empty' }));
        }
      })
      .catch(() => {
        setAppData(prev => ({ ...prev, status: 'empty' }));
      });
  }, []);

  const loadData = useCallback((payload) => {
    setAppData(prev => ({
      ...prev,
      ...payload,
      status: 'ready',
      error: null,
    }));
  }, []);

  const setLoading = useCallback(() => {
    setAppData(prev => ({ ...prev, status: 'loading' }));
  }, []);

  const setError = useCallback((msg) => {
    setAppData(prev => ({ ...prev, status: 'error', error: msg }));
  }, []);

  return (
    <DataContext.Provider value={{ appData, loadData, setLoading, setError }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
};

export default DataContext;
