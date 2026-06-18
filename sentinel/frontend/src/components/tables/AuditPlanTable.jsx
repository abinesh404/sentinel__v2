import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Shield,
  FileCheck,
  Loader,
  Calendar,
  Users,
  ClipboardList
} from 'lucide-react';

const getArmUrl = (procName) => {
  if (window.ARM_URL) {
    return `${window.ARM_URL}/prs/${encodeURIComponent(procName)}`;
  }
  const { protocol, hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://localhost:4003/prs/${encodeURIComponent(procName)}`;
  }
  let origin = window.location.origin;
  if (origin.includes('sentinel')) {
    origin = origin.replace('sentinel', 'arm');
    return `${origin}/prs/${encodeURIComponent(procName)}`;
  }
  const { pathname } = window.location;
  if (pathname.includes('/sentinel')) {
    const newPath = pathname.replace('/sentinel', '/arm');
    const base = newPath.endsWith('/') ? newPath : newPath + '/';
    return `${protocol}//${hostname}${base}prs/${encodeURIComponent(procName)}`;
  }
  return `${origin}/prs/${encodeURIComponent(procName)}`;
};

const AuditPlanTable = ({ onKpiUpdate }) => {
  const navigate = useNavigate();
  const { appData } = useData();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(() => document.body.classList.contains('light-mode') ? 'light' : 'dark');
  useEffect(() => {
    const handleThemeChange = () => {
      setTheme(document.body.classList.contains('light-mode') ? 'light' : 'dark');
    };
    window.addEventListener('theme-changed', handleThemeChange);
    return () => window.removeEventListener('theme-changed', handleThemeChange);
  }, []);

  // Bottom-bar global fields for the audit plan
  const getDefaultStartDate = () => {
    const today = new Date();
    if (today.getDay() === 0) {
      today.setDate(today.getDate() + 1);
    }
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [plantsList, setPlantsList] = useState([]);
  const [plantDropdownOpen, setPlantDropdownOpen] = useState(false);
  const plantButtonRef = useRef(null);
  const [plantDropdownCoords, setPlantDropdownCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!plantDropdownOpen || !plantButtonRef.current) return;
    
    const updateCoords = () => {
      const rect = plantButtonRef.current.getBoundingClientRect();
      setPlantDropdownCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    };
    
    updateCoords();
    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords, true);
    
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [plantDropdownOpen]);

  useEffect(() => {
    fetch('/api/plants')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPlantsList(data);
      })
      .catch(err => console.error("Failed to load plants:", err));
  }, []);

  // Close plant dropdown when clicking outside
  useEffect(() => {
    if (!plantDropdownOpen) return;
    const handleOutsideClick = () => {
      setPlantDropdownOpen(false);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [plantDropdownOpen]);

  const [globalFields, setGlobalFields] = useState({
    startDate: getDefaultStartDate(),
    endDate: '',
    auditors: [],
    auditType: 'Internal Audit',
    auditName: '',
    plants: [],
    leadAuditor: '',
    auditDescription: '',
    department: 'Finance',
  });

  const [validationErrors, setValidationErrors] = useState({
    startDate: false,
    endDate: false,
    auditors: false,
    auditType: false,
    auditName: false,
    department: false,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [rowDropdownOpenId, setRowDropdownOpenId] = useState(null);
  const [auditorsList, setAuditorsList] = useState([]);
  const [newAuditorName, setNewAuditorName] = useState('');

  // Close row auditor dropdown when clicking anywhere else
  useEffect(() => {
    if (!rowDropdownOpenId) return;
    const handleOutsideClick = () => {
      setRowDropdownOpenId(null);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [rowDropdownOpenId]);

  // Static fallback auditors from Master data for Auditors.xlsx
  const FALLBACK_AUDITORS = [
    { id: 1, name: 'Sanyam Jangir' },
    { id: 2, name: 'Marshal Mathers' },
    { id: 3, name: 'Chinmay' },
    { id: 4, name: 'Godwin' },
    { id: 5, name: 'Anurag' },
    { id: 6, name: 'Pratik' },
    { id: 7, name: 'Ram' },
    { id: 8, name: 'Lakshman' },
    { id: 9, name: 'Bharat' },
    { id: 10, name: 'Shatrughna' },
    { id: 11, name: 'Vinay' },
    { id: 12, name: 'Rudra' },
    { id: 13, name: 'Poorna' },
    { id: 14, name: 'Anakha' },
    { id: 15, name: 'Abinesh' },
    { id: 16, name: 'Abel Makkonen Tesfaye' },
  ];

  // Load auditors
  useEffect(() => {
    fetch('/api/auditors?tenant_id=CJSJ')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setAuditorsList(data);
        else setAuditorsList(FALLBACK_AUDITORS);
      })
      .catch(() => setAuditorsList(FALLBACK_AUDITORS));
  }, []);

  // Initialize row-level selectedAuditors from recommended auditors count when lists are ready
  useEffect(() => {
    if (auditorsList.length === 0 || rows.length === 0) return;
    const needsInit = rows.some(r => r.selectedAuditors === undefined);
    if (needsInit) {
      setRows(prev => {
        const used = new Set();
        prev.forEach(r => {
          if (r.selectedAuditors !== undefined) {
            (r.selectedAuditors || []).forEach(name => used.add(name));
          }
        });
        return prev.map(r => {
          if (r.selectedAuditors !== undefined) return r;
          const count = Math.max(1, Math.ceil((r.controls || []).length / 3));
          const selected = [];
          for (let i = 0; i < auditorsList.length; i++) {
            const name = auditorsList[i].name;
            if (selected.length < count && !used.has(name)) {
              selected.push(name);
              used.add(name);
            }
          }
          return {
            ...r,
            selectedAuditors: selected,
            auditors: count
          };
        });
      });
    }
  }, [auditorsList, rows]);

  const SAMPLE_RCM_RECORDS = [
    {
      id: "plan_p2p",
      process_name: "Procure to Pay",
      risk_area: "Purchase Orders deliberately split below approval thresholds to circumvent Delegation of Authority, enabling unauthorised procurement.",
      risk_score: 92,
      man_hours: 96,
      controls: [
        "ERP is configured to validate PO unit price against the contract price at PO creation. POs with price above the contracted price are blocked automatically. Any approved price deviation requires Finance Controller and VP – Supply Chain approval with documented justification. Monthly PO Price Deviation Report is reviewed by Internal Audit. Data analytics quarterly identifies POs referencing a contract but priced above the contract rate.",
        "All vendor bank account changes require cancelled cheque verification and CFO approval with 48-hour cooling-off period before activation. IT Security monitors vendor master bank detail changes weekly. Monthly analytics identify vendors whose bank account was changed and then reinstated within 30 days — all such instances immediately escalated to Internal Audit and CFO for investigation.",
        "The use of unplanned delivery cost fields in the ERP GR/IR process is restricted to authorised users only. Any unplanned delivery cost posting requires a specific reason code and Finance Controller approval before the invoice can be paid. Monthly report of all unplanned delivery cost postings is reviewed by Internal Audit. Data analytics quarterly identifies invoices where total payment exceeds approved PO value by more than 3%.",
        "Executive- AP Finance initiates the payment as per the due dates in the bank portal and the same is authorized in the portal as per DOA. In case of non-compliance interest charged or provision made on the delayed payment to MSME vendor is approved by Lead-Finance Controllership.",
        "ERP records all PO amendments with timestamp and user ID. Monthly analytics identify POs where price or quantity changed after at least one GRN was posted. All post-GRN PO changes require VP – Supply Chain and Finance Controller approval. Instances without prior approval investigated by Internal Audit.",
        "Quarterly data analytics identify PO splitting: multiple POs to the same vendor for the same material within 5 days, each below DoA threshold but cumulatively above. Confirmed split POs investigated and responsible employees subject to disciplinary action. Results reported to Audit Committee."
      ]
    },
    {
      id: "plan_o2c",
      process_name: "Order to Cash",
      risk_area: "Goods sold at zero or nominal value without proper authorisation lead to revenue loss and potential collusion with customers.",
      risk_score: 72,
      man_hours: 112,
      controls: [
        "ERP restricts return credit price to maximum of original sales invoice price. Credit note above original invoice price requires VP – Sales and Finance Manager approval. Monthly analytics identify sales returns where credit price exceeds original sale price. All exceptions investigated by Internal Audit.",
        "ERP analytics identify instances where more than one return order is raised against the same sales invoice or for the same material-customer-plant combination within a rolling 30-day window. All such multi-return instances are automatically flagged and routed to VP – Sales and Internal Audit for review before the credit note is processed. Finance Controller verifies the total return quantity across all return orders does not exceed the original invoiced quantity. Confirmed fraudulent or unsupported returns are reversed and escalated to the Audit Committee. Monthly multi-return exception register is reviewed by CFO.",
        "ERP is configured to flag and hold any return order where the return date is within 3 days of the original invoice date. Such returns require mandatory dual approval from VP – Sales and the Quality Manager (confirming physical receipt of returned goods) before the return GRN and credit note can be posted. The Warehouse team must record an independent Goods Receipt Note for the returned material before ERP allows credit note creation. Monthly report of immediate returns (≤3 days) is reviewed by Internal Audit and CFO. Patterns of immediate returns by specific customers, salespersons, or SKUs are investigated as a high-priority fraud indicator.",
        "ERP return module enforces a hard system block preventing creation of return orders for invoices older than 180 days. Exceptions require documented commercial justification and joint approval from VP – Sales and CFO. Quality Manager must physically verify condition and shelf life of returned goods before any exception is granted. All approved >180-day returns are tagged as exceptions in ERP and reported to the Audit Committee in the subsequent quarter. Monthly analytics identify attempted late returns blocked by the system; patterns of repeated attempts are escalated to Internal Audit for investigation.",
        "ERP validates return quantity against original SO and Delivery Note at batch/customer level. Returns exceeding original shipped quantity blocked and require Finance Manager and VP – Sales dual approval. Monthly analytics identify all excess return transactions. Anomalies investigated and reported to CFO.",
        "ERP configured with maximum over-delivery tolerance (e.g. 3%) for each product. Deliveries exceeding tolerance blocked pending Sales Manager approval. Monthly report of over-tolerance deliveries reviewed by VP – Sales and Finance Controller.",
        "Free-of-cost sales require Promotional Authorisation Form approved by VP – Sales and Finance Controller specifying customer, quantity, justification and period. ERP flags all zero-value sales orders for review before release. Monthly report of FOC transactions reviewed by CFO. Cumulative FOC sales above INR 10L per customer per year require MD/CEO approval."
      ]
    },
    {
      id: "plan_scrap",
      process_name: "Scrap Management",
      risk_area: "Scrap Sales",
      risk_score: 72,
      man_hours: 16,
      controls: [
        "All scrap and rework quantities are recorded by operators on job cards and entered into the ERP system. The Production Manager reviews the daily scrap/rework report. Pareto analysis of scrap causes is performed monthly by the Quality team and presented to the Plant Head. Corrective actions are tracked to closure in the CAPA system."
      ]
    },
    {
      id: "plan_inventory",
      process_name: "Inventory Management",
      risk_area: "Procurement occurs for materials where existing inventory already exceeds reorder level, leading to excess stock and high carrying costs.",
      risk_score: 92,
      man_hours: 32,
      controls: [
        "Standard yield / scrap percentages are defined in the BOM/routing for each production process. Monthly analytics compare actual yield loss per work order against the standard, flagging deviations >5% by material or production line. Significant variances are investigated by the Production Manager and Quality Engineer with root cause documented in the CAPA system. Yield loss trend analysis (actual vs. standard) is reviewed by Plant Head monthly.",
        "ERP MRP run checks available stock against reorder level before generating purchase proposals. Procurement Manager reviews all proposals for materials already above reorder level. Monthly overstock analytics (stock > 6 months' consumption) reviewed by VP – Supply Chain. Procurement for overstocked materials requires VP – Supply Chain approval."
      ]
    },
    {
      id: "plan_quality",
      process_name: "Quality Management",
      risk_area: "Expired, quality-rejected or quality-hold materials issued for production or dispatched to market, leading to product safety failures and regulatory non-compliance.",
      risk_score: 72,
      man_hours: 32,
      controls: [
        "finished goods lots undergo Final Quality Inspection (FQI) against product specification and AQL sampling plan before transfer to the finished goods warehouse. Lots passing FQI receive a 'Release' disposition in the ERP. Lots failing FQI are placed on 'Hold' and an NCR is raised. No dispatch is permitted without an ERP-generated Release note.",
        "ERP system is configured to block issuance of materials with 'QA Reject', 'Hold' or 'Expired' status to production orders. Attempted override triggers an automatic alert to the Quality Manager and Plant Head. Blocked material transactions are reviewed daily by QA. Physical segregation in a locked quarantine zone is enforced and audited monthly by Internal Audit."
      ]
    },
    {
      id: "plan_taxation",
      process_name: "Taxation",
      risk_area: "Ineligible ITC may be claimed leading to regulatory exposure.",
      risk_score: 72,
      man_hours: 32,
      controls: [
        "TDS rate accuracy validated monthly by Tax team comparing ERP-deducted rates against applicable rates for each vendor/transaction category. Discrepancies corrected and shortfall paid with interest before next challan due date. Excess deductions refunded to vendors and corrected in GSTR-26Q filing. Director – Tax reviews monthly TDS exception report.",
        "ITC reconciliation is performed between purchase records and GST portal data before claim."
      ]
    },
    {
      id: "plan_cyber",
      process_name: "Cyber Security",
      risk_area: "Inadequate database security (weak passwords, excessive file permissions, insecure configuration settings) exposes the SAP database to unauthorised access and data manipulation.",
      risk_score: 92,
      man_hours: 16,
      controls: [
        "Database security baseline (covering password complexity, session timeout, file permissions, listener security, encrypted connections and audit logging) is defined and configured by the DBA team under IT Security oversight. Quarterly automated database vulnerability scans are performed by IT Security. Database configuration is reviewed semi-annually against the baseline. Direct database access (bypassing SAP application layer) is restricted to DBAs and logged. All DBA activities are reviewed monthly by IT Security Manager."
      ]
    }
  ];

  // Initialize and fetch rows from strategic plan API
  useEffect(() => {
    if (appData.status === 'loading') {
      return;
    }

    setLoading(true);
    fetch(`/api/strategic-plan?tenant_id=CJSJ`)
      .then(res => res.json())
      .then(data => {
        if (!data || data.length === 0) {
          setRows([]);
          return;
        }
        const mapped = data.map((item, idx) => ({
          id: item.process_name ? `plan_${item.process_name.replace(/\s+/g, '_')}_${idx}` : `plan_${idx}`,
          ...item,
          controls: (item.controls || []).slice(0, 20)
        }));

        setRows(mapped);
      })
      .catch(err => {
        console.error("Failed to load strategic plan:", err);
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [appData.status, appData.filename]);

  // Track expanded rows and search queries
  const [expandedRows, setExpandedRows] = useState({});
  const [controlSearch, setControlSearch] = useState({});

  // Toggle row expansion
  const toggleRow = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
    if (!expandedRows[id]) {
      setControlSearch(prev => ({ ...prev, [id]: '' }));
    }
  };
  const [newProcess, setNewProcess] = useState('');
  const [newRiskArea, setNewRiskArea] = useState('');
  const [newControlDesc, setNewControlDesc] = useState('');
  const [newRiskScore, setNewRiskScore] = useState(88);
  const [newManHours, setNewManHours] = useState(40);
  const [newAuditors, setNewAuditors] = useState(1);


  // Inline edits
  const handleHoursChange = (id, val) => {
    const hours = parseInt(val) || 0;
    setRows(prev => prev.map(r => r.id === id ? { ...r, man_hours: hours } : r));
  };

  const handleAddRowAuditor = (rowId, auditorName) => {
    setRows(prev => prev.map(r => {
      if (r.id === rowId) {
        const selected = [...(r.selectedAuditors || [])];
        if (!selected.includes(auditorName)) {
          selected.push(auditorName);
        }
        return {
          ...r,
          selectedAuditors: selected,
          auditors: selected.length
        };
      }
      return r;
    }));
  };

  const handleRemoveRowAuditor = (rowId, auditorName) => {
    setRows(prev => prev.map(r => {
      if (r.id === rowId) {
        const selected = (r.selectedAuditors || []).filter(name => name !== auditorName);
        return {
          ...r,
          selectedAuditors: selected,
          auditors: selected.length
        };
      }
      return r;
    }));
  };

  const handleCreateAndAssignAuditor = (rowId, name) => {
    const trimmed = name.trim();
    if (!trimmed) {
      alert('Please enter an auditor name.');
      return;
    }
    fetch('/api/auditors/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: 'CJSJ', name: trimmed })
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to add');
        return res.json();
      })
      .then(data => {
        if (data.success && data.auditor) {
          setAuditorsList(prev => {
            if (prev.some(a => a.name.toLowerCase() === trimmed.toLowerCase())) {
              return prev;
            }
            return [...prev, data.auditor];
          });
          handleAddRowAuditor(rowId, data.auditor.name);
        }
      })
      .catch(err => {
        console.error('Failed to add auditor, using local fallback:', err);
        const nextId = Math.max(...auditorsList.map(a => a.id), 0) + 1;
        const newAud = { id: nextId, name: trimmed };
        setAuditorsList(prev => [...prev, newAud]);
        handleAddRowAuditor(rowId, trimmed);
      })
      .finally(() => {
        setNewAuditorName('');
        setRowDropdownOpenId(null);
      });
  };

  // Delete Row
  const deleteRow = (id) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  // Remove individual control/insight from a process
  const removeInsight = (rowId, index) => {
    setRows(prev => prev.map(r => {
      if (r.id === rowId) {
        const updatedControls = [...(r.controls || [])];
        updatedControls.splice(index, 1);
        const newHours = updatedControls.length * 16;
        return {
          ...r,
          controls: updatedControls.slice(0, 20),
          man_hours: newHours
        };
      }
      return r;
    }));
  };

  const handleAddControl = (rowId, controlDesc) => {
    setRows(prev => prev.map(r => {
      if (r.id === rowId) {
        const updatedControls = [...(r.controls || [])];
        updatedControls.push(controlDesc);
        const newHours = updatedControls.length * 16;
        return {
          ...r,
          controls: updatedControls.slice(0, 20),
          man_hours: newHours
        };
      }
      return r;
    }));
  };

  // Add Manual Row
  const handleAddManualRow = () => {
    if (!newProcess.trim()) {
      alert('Please enter a process name.');
      return;
    }
    let pName = newProcess.trim();
    if (pName.toUpperCase() === 'ITGC' || pName.toUpperCase().includes('IT GENERAL CONTROLS')) {
      pName = 'Cyber Security';
    }
    const newId = `plan_manual_${Date.now()}`;
    const selected = [];
    for (let i = 0; i < newAuditors && i < auditorsList.length; i++) {
      selected.push(auditorsList[i].name);
    }
    const finalControls = newControlDesc.trim() ? [{
      control_description: newControlDesc.trim(),
      risk_description: newRiskArea.trim() || 'Custom Process Sub-area'
    }] : [];
    const computedHours = finalControls.length * 16;
    const newRow = {
      id: newId,
      process_name: pName,
      risk_area: newRiskArea.trim() || 'Custom Process Sub-area',
      risk_score: newRiskScore,
      man_hours: computedHours,
      auditors: selected.length,
      selectedAuditors: selected,
      controls: finalControls
    };

    setRows(prev => [...prev, newRow]);

    // Reset inputs
    setNewProcess('');
    setNewRiskArea('');
    setNewControlDesc('');
    setNewRiskScore(88);
    setNewManHours(40);
    setNewAuditors(1);
  };

  const handleAutoAssignAll = () => {
    setRows(prev => {
      const used = new Set();
      return prev.map(r => {
        const count = Math.max(1, Math.ceil((r.controls || []).length / 3));
        const selected = [];
        for (let i = 0; i < auditorsList.length; i++) {
          const name = auditorsList[i].name;
          if (selected.length < count && !used.has(name)) {
            selected.push(name);
            used.add(name);
          }
        }
        if (selected.length < count) {
          for (let i = 0; i < auditorsList.length; i++) {
            const name = auditorsList[i].name;
            if (selected.length < count && !selected.includes(name)) {
              selected.push(name);
            }
          }
        }
        return {
          ...r,
          selectedAuditors: selected,
          auditors: selected.length
        };
      });
    });
  };

  const handleClearAllAuditors = () => {
    setRows(prev => prev.map(r => ({
      ...r,
      selectedAuditors: [],
      auditors: 0
    })));
  };

  // Calculate Totals dynamically
  const totals = useMemo(() => {
    let hoursSum = 0;
    let auditorsSum = 0;
    let highPriorityCount = 0;

    rows.forEach(r => {
      hoursSum += r.man_hours || 0;
      const recAuds = (r.selectedAuditors || []).length;
      auditorsSum += recAuds;
    });
    highPriorityCount = rows.length;

    return { hoursSum, auditorsSum, highPriorityCount };
  }, [rows]);

  const isEndDateCustomized = useRef(false);

  // Sync default end date based on start date and total effort
  useEffect(() => {
    if (isEndDateCustomized.current) return;
    if (globalFields.startDate && totals.hoursSum) {
      const d = new Date(globalFields.startDate);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + Math.ceil(totals.hoursSum / 8));
        const recEnd = d.toISOString().split('T')[0];
        setGlobalFields(prev => ({ ...prev, endDate: recEnd }));
      }
    }
  }, [globalFields.startDate, totals.hoursSum]);

  // Notify parent component when totals or rows change
  useEffect(() => {
    if (onKpiUpdate) {
      onKpiUpdate({
        highPriority: totals.highPriorityCount,
        effortHours: totals.hoursSum,
        auditors: totals.auditorsSum,
        processes: rows.map(r => r.process_name)
      });
    }
  }, [totals, rows, onKpiUpdate]);

  const handleCreateTemplate = async () => {
    // Validation checking
    const uniqueAuditors = [...new Set(rows.flatMap(r => r.selectedAuditors || []))];

    const errors = {
      startDate: !globalFields.startDate,
      endDate: !globalFields.endDate,
      auditors: uniqueAuditors.length === 0,
      auditType: !globalFields.auditType,
      auditName: !globalFields.auditName || !globalFields.auditName.trim(),
      department: !globalFields.department,
    };
    setValidationErrors(errors);

    const hasErrors = Object.values(errors).some(Boolean);
    if (hasErrors) {
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('http://localhost:4000/api/generate-audit-presentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: 'CJSJ',
          audit_type: globalFields.auditType,
          audit_name: globalFields.auditName,
          start_date: globalFields.startDate,
          end_date: globalFields.endDate,
          auditors: uniqueAuditors,
          rows: rows,
          audit_period: `${globalFields.auditName} (${globalFields.startDate} to ${globalFields.endDate})`,
          audit_manager: uniqueAuditors.join(', '),
          uploaded_rcm_id: 'rcm_123',
          department: globalFields.department
        })
      });

      if (!response.ok) throw new Error('Failed to generate presentation');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `Sentinel_Audit_Plan_${globalFields.auditName.replace(/\s+/g, '_')}.pptx`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error(error);
      alert('Error generating presentation. Ensure the backend is running.');
    } finally {
      setIsGenerating(false);
    }
  };


  if (loading) {
    return (
      <div style={{
        background: 'var(--surface)',
        backdropFilter: 'blur(14px)',
        border: '1px solid var(--border)',
        borderRadius: '18px',
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
      }}>
        <Loader className="spinner" size={24} style={{ color: '#2dd4bf', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '13px', color: '#64748b' }}>Loading Strategic Audit Plan Allocation data...</span>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div style={{
        background: 'var(--surface)',
        backdropFilter: 'blur(14px)',
        border: '1px solid var(--border)',
        borderRadius: '18px',
        padding: '40px',
        textAlign: 'center',
        color: '#64748b',
      }}>
        No audit plan data available. Please upload an audit file in the Upload Center.
      </div>
    );
  }

  // ─── Dark Theme Input Styles ─────────────────────
  const darkInputStyle = {
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '6px 10px',
    fontSize: '13px',
    color: 'var(--text-primary)',
    background: 'var(--surface-muted)',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    transition: 'all 0.22s cubic-bezier(.4,0,.2,1)',
  };

  const getDarkFieldStyle = (isInvalid, extraStyles = {}) => ({
    ...darkInputStyle,
    borderColor: isInvalid ? '#EF4444' : 'rgba(148, 163, 184, 0.15)',
    boxShadow: isInvalid ? '0 0 0 1px rgba(239,68,68,0.3)' : 'none',
    ...extraStyles
  });

  // ─── Pill Badge Helper ─────────────────────
  const pillBadge = (value, color, bgOpacity = '0.15') => {
    const colors = {
      teal: { text: '#2dd4bf', bg: `rgba(45, 212, 191, ${bgOpacity})` },
      orange: { text: '#fbbf24', bg: `rgba(251, 191, 36, ${bgOpacity})` },
      red: { text: '#f87171', bg: `rgba(248, 113, 113, ${bgOpacity})` },
      green: { text: '#34d399', bg: `rgba(52, 211, 153, ${bgOpacity})` },
    };
    const c = colors[color] || colors.teal;
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '36px',
        padding: '5px 14px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: '700',
        color: c.text,
        background: c.bg,
        border: `1px solid ${c.text}22`,
        fontFamily: 'Inter, sans-serif',
      }}>
        {value}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Strategic Table */}
      <div className="card" style={{
        padding: '0',
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
        {/* Top accent line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.4) 30%, rgba(99, 102, 241, 0.6) 50%, rgba(45, 212, 191, 0.4) 70%, transparent)',
          zIndex: 1,
        }} />

        {/* Table Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '18px 24px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ClipboardList size={18} style={{ color: '#818cf8' }} />
            <h2 className="title" style={{ margin: 0, marginBottom: 0 }}>
              Strategic Audit <span>Allocation Plan</span>
            </h2>
          </div>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: '600',
            borderRadius: '20px',
            background: 'rgba(56, 189, 248, 0.12)',
            color: '#38bdf8',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            letterSpacing: '0.02em',
          }}>
            {rows.length} active process
          </span>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table" style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            textAlign: 'left',
          }}>
            <thead>
              <tr>
                <th style={thStyle}></th>
                <th style={thStyle}>Process</th>
                <th style={thStyle}>Risk Area / Sub-Process</th>
                <th style={{ ...thStyle, width: '130px', textAlign: 'center' }}>Controls Count</th>
                <th style={{ ...thStyle, width: '120px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }} title="Risk score is calculated by Sentinel AI based on impact, likelihood, and historical fraud data.">
                    AI Risk Score
                  </div>
                </th>
                <th style={{ ...thStyle, width: '190px', textAlign: 'center' }}>Recommended Man-Hours</th>
                <th style={{ ...thStyle, width: '280px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Auditor</span>
                    <button
                      onClick={handleClearAllAuditors}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#f87171',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                      title="Clear All Assigned Auditors"
                    >
                      <Trash2 size={13} />
                    </button>
                    <button
                      onClick={handleAutoAssignAll}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#34d399',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                      title="Auto-Assign Recommended Auditors"
                    >
                      <Users size={13} />
                    </button>
                  </div>
                </th>
                <th style={{ ...thStyle, width: '150px', textAlign: 'center' }}>Recommended Auditors</th>
                <th style={{ ...thStyle, width: '80px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.filter(r => r.process_name && String(r.process_name).trim() !== '').map((row, index) => {
                const isExpanded = expandedRows[row.id];
                const nestedControls = row.controls || [];

                return (
                  <React.Fragment key={row.id}>
                    {/* Master Row */}
                    <tr style={{
                      backgroundColor: index % 2 === 0 ? 'transparent' : 'var(--bg-stripe)',
                      transition: 'background-color 0.2s ease',
                    }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.06)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'transparent' : 'var(--bg-stripe)'}
                    >
                      <td style={tdStyle}>
                        {nestedControls.length > 0 ? (
                          <button
                            onClick={() => toggleRow(row.id)}
                            style={{
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                              color: '#94a3b8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '4px',
                              borderRadius: '6px',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#f1f5f9'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                          >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        ) : (
                          <div style={{ width: '16px', height: '16px' }} />
                        )}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: '600', color: theme === 'light' ? '#000000' : '#f1f5f9' }}>
                        {String(row.process_name).toUpperCase() === 'ITGC' || String(row.process_name).toUpperCase().includes('IT GENERAL CONTROLS') ? 'Cyber Security' : row.process_name}
                      </td>
                      <td style={{ ...tdStyle, color: '#64748b', fontSize: '13px' }}>{row.risk_area}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {pillBadge(nestedControls.length, 'teal')}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <div 
                          onClick={() => {
                            const procName = String(row.process_name).toUpperCase() === 'ITGC' || String(row.process_name).toUpperCase().includes('IT GENERAL CONTROLS') ? 'Cyber Security' : row.process_name;
                            window.open(getArmUrl(procName), '_blank');
                          }}
                          style={{ cursor: 'pointer', display: 'inline-block' }}
                          title={`View ${String(row.process_name).toUpperCase() === 'ITGC' || String(row.process_name).toUpperCase().includes('IT GENERAL CONTROLS') ? 'Cyber Security' : row.process_name} ARM Details`}
                        >
                          {pillBadge(row.risk_score, row.risk_score >= 85 ? 'red' : row.risk_score >= 10 ? 'orange' : 'green')}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <input
                          type="number"
                          value={row.man_hours}
                          onChange={(e) => handleHoursChange(row.id, e.target.value)}
                          style={{
                            ...darkInputStyle,
                            width: '80px',
                            padding: '6px 10px',
                            textAlign: 'center',
                            fontWeight: '600',
                            color: '#2dd4bf',
                            background: 'rgba(45, 212, 191, 0.08)',
                            border: '1px solid rgba(45, 212, 191, 0.2)',
                            borderRadius: '20px',
                          }}
                        />
                      </td>
                      {/* Auditor pills & dropdown trigger */}
                      <td style={{ ...tdStyle, textAlign: 'left' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                          {(row.selectedAuditors || []).map(aud => (
                            <span
                              key={aud}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                                color: '#a5b4fc',
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                              }}
                            >
                              {aud}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveRowAuditor(row.id, aud);
                                }}
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  color: '#f87171',
                                  cursor: 'pointer',
                                  padding: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                }}
                              >
                                ×
                              </button>
                            </span>
                          ))}

                          <div style={{ position: 'relative' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRowDropdownOpenId(rowDropdownOpenId === row.id ? null : row.id);
                              }}
                              style={{
                                border: '1px dashed rgba(148, 163, 184, 0.3)',
                                background: 'rgba(255, 255, 255, 0.02)',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: '600',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                                e.currentTarget.style.color = 'var(--text-primary)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.3)';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                              }}
                            >
                              <Plus size={12} /> Add
                            </button>

                            {rowDropdownOpenId === row.id && (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                marginTop: '4px',
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                boxShadow: 'var(--shadow-lg)',
                                padding: '8px',
                                zIndex: 10,
                                maxHeight: '220px',
                                overflowY: 'auto',
                                minWidth: '220px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                boxSizing: 'border-box'
                              }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto', maxHeight: '180px' }}>
                                  {auditorsList
                                    .filter(a => !(row.selectedAuditors || []).includes(a.name))
                                    .map(a => (
                                      <button
                                        key={a.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAddRowAuditor(row.id, a.name);
                                          setRowDropdownOpenId(null);
                                        }}
                                        style={{
                                          border: 'none',
                                          background: 'none',
                                          color: 'var(--text-primary)',
                                          textAlign: 'left',
                                          padding: '6px 8px',
                                          borderRadius: '6px',
                                          cursor: 'pointer',
                                          fontSize: '12px',
                                          transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.12)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                      >
                                        {a.name}
                                      </button>
                                    ))}
                                  {auditorsList.filter(a => !(row.selectedAuditors || []).includes(a.name)).length === 0 && (
                                    <span style={{ padding: '6px 8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                      No auditors available
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Recommended Auditors count (read-only) */}
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {pillBadge((row.selectedAuditors || []).length, 'teal')}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button
                          onClick={() => deleteRow(row.id)}
                          style={{
                            border: 'none',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#f87171',
                            cursor: 'pointer',
                            padding: '7px',
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                            e.currentTarget.style.color = '#fca5a5';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                            e.currentTarget.style.color = '#f87171';
                          }}
                          title="Delete Process"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>

                    {/* Detail Expanded Controls Row */}
                    {isExpanded && nestedControls.length > 0 && (
                      <tr>
                        <td colSpan="9" style={{
                          backgroundColor: 'var(--surface-muted)',
                          padding: '16px 24px 16px 56px',
                          borderBottom: '1px solid rgba(148, 163, 184, 0.06)',
                        }}>
                          <div style={{
                            borderLeft: '3px solid #2dd4bf',
                            paddingLeft: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Specific Controls to Test:
                              </span>
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <input
                                  type="text"
                                  placeholder="Search controls..."
                                  value={controlSearch[row.id] || ''}
                                  onChange={(e) => setControlSearch(prev => ({ ...prev, [row.id]: e.target.value }))}
                                  style={{
                                    ...darkInputStyle,
                                    width: '180px',
                                    padding: '6px 12px',
                                  }}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <input
                                    type="text"
                                    placeholder="Add new control description..."
                                    id={`add-control-input-${row.id}`}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const desc = e.target.value.trim();
                                        if (desc) {
                                          handleAddControl(row.id, desc);
                                          e.target.value = '';
                                        }
                                      }
                                    }}
                                    style={{
                                      ...darkInputStyle,
                                      width: '260px',
                                      padding: '6px 12px',
                                    }}
                                  />
                                  <button
                                    onClick={() => {
                                      const input = document.getElementById(`add-control-input-${row.id}`);
                                      if (input) {
                                        const desc = input.value.trim();
                                        if (desc) {
                                          handleAddControl(row.id, desc);
                                          input.value = '';
                                        }
                                      }
                                    }}
                                    style={{
                                      border: 'none',
                                      background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
                                      color: '#ffffff',
                                      cursor: 'pointer',
                                      padding: '6px 10px',
                                      borderRadius: '8px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 'bold',
                                      height: '32px',
                                      width: '32px',
                                    }}
                                    title="Add Control"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>

                            {nestedControls.length === 0 ? (
                              <p style={{ fontSize: '13px', color: '#64748b' }}>
                                {appData.status === 'ready'
                                  ? 'No controls found in the uploaded audit data for this process.'
                                  : 'Please upload an audit file in the Upload Center to view parsed controls.'}
                              </p>
                            ) : (
                              <div style={{ overflowX: 'auto', width: '100%' }}>
                                <table style={{
                                  width: '100%',
                                  borderCollapse: 'separate',
                                  borderSpacing: 0,
                                  border: '1px solid rgba(148, 163, 184, 0.08)',
                                  borderRadius: '12px',
                                  overflow: 'hidden',
                                }}>
                                  <thead>
                                    <tr>
                                      <th style={{
                                        ...thStyle,
                                        fontSize: '11px',
                                        padding: '10px 16px',
                                        background: 'var(--surface-muted)',
                                      }}>Control Description</th>
                                      <th style={{
                                        ...thStyle,
                                        fontSize: '11px',
                                        padding: '10px 16px',
                                        width: '80px',
                                        textAlign: 'center',
                                        background: 'var(--surface-muted)',
                                      }}>Remove</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {nestedControls.filter(ctrl => {
                                      const sq = (controlSearch[row.id] || '').toLowerCase();
                                      if (!sq) return true;
                                      const desc = typeof ctrl === 'string' ? ctrl : (ctrl.control_description || ctrl.ControlDescription || '');
                                      const pid = row.process_name || '';
                                      return desc.toLowerCase().includes(sq) || pid.toLowerCase().includes(sq);
                                    }).map((ctrl, idx) => {
                                      let rawDescription = typeof ctrl === 'string' ? ctrl : (ctrl.control_description || ctrl.ControlDescription || '');
                                      const description = rawDescription.replace(/\[.*?\]\s*/g, '').replace(/Control Type:\s*/gi, '').trim();
                                      const isEmptySlot = !description || description === '';
                                      return (
                                        <tr key={idx}>
                                          <td style={{
                                            padding: '12px 16px',
                                            fontSize: '13.5px',
                                            fontFamily: "'Inter', sans-serif",
                                            fontWeight: '400',
                                            color: isEmptySlot ? '#475569' : 'var(--text-primary)',
                                            lineHeight: '1.6',
                                            whiteSpace: 'normal',
                                            wordBreak: 'break-word',
                                            fontStyle: isEmptySlot ? 'italic' : 'normal',
                                            borderBottom: '1px solid rgba(148, 163, 184, 0.06)',
                                          }}>
                                            {isEmptySlot ? '[Empty Insight Slot / Placeholder]' : description}
                                          </td>
                                          <td style={{
                                            textAlign: 'center',
                                            verticalAlign: 'middle',
                                            borderBottom: '1px solid rgba(148, 163, 184, 0.06)',
                                            width: '80px',
                                          }}>
                                            {!isEmptySlot && (
                                              <button
                                                onClick={() => removeInsight(row.id, idx)}
                                                style={{
                                                  border: 'none',
                                                  background: 'rgba(239, 68, 68, 0.08)',
                                                  color: '#f87171',
                                                  cursor: 'pointer',
                                                  padding: '5px',
                                                  borderRadius: '6px',
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  transition: 'all 0.2s',
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.18)'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)'}
                                                title="Remove Control"
                                              >
                                                <Minus size={14} />
                                              </button>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Row to add manual process */}
              <tr style={{ backgroundColor: 'var(--surface-muted)' }}>
                <td style={tdStyle}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2dd4bf' }}>
                    <Plus size={16} />
                  </span>
                </td>
                <td style={tdStyle}>
                  <input
                    type="text"
                    placeholder="e.g. Treasury Operations"
                    value={newProcess}
                    onChange={(e) => setNewProcess(e.target.value)}
                    style={{ ...darkInputStyle, width: '100%', padding: '6px 10px' }}
                  />
                </td>
                <td style={tdStyle}>
                  <input
                    type="text"
                    placeholder="e.g. Cash Mgmt & FX"
                    value={newRiskArea}
                    onChange={(e) => setNewRiskArea(e.target.value)}
                    style={{ ...darkInputStyle, width: '100%', padding: '6px 10px' }}
                  />
                </td>
                <td style={tdStyle}>
                  <input
                    type="text"
                    placeholder="e.g. Verify transaction approvals..."
                    value={newControlDesc}
                    onChange={(e) => setNewControlDesc(e.target.value)}
                    style={{ ...darkInputStyle, width: '100%', padding: '6px 10px' }}
                  />
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newRiskScore}
                    onChange={(e) => setNewRiskScore(parseInt(e.target.value) || 0)}
                    style={{
                      ...darkInputStyle,
                      width: '60px',
                      padding: '4px 6px',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#fbbf24',
                      background: 'rgba(251, 191, 36, 0.08)',
                      border: '1px solid rgba(251, 191, 36, 0.2)',
                      borderRadius: '10px',
                    }}
                  />
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <input
                    type="number"
                    min="1"
                    value={newManHours}
                    onChange={(e) => setNewManHours(parseInt(e.target.value) || 0)}
                    style={{
                      ...darkInputStyle,
                      width: '65px',
                      padding: '4px 6px',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#2dd4bf',
                      background: 'rgba(45, 212, 191, 0.08)',
                      border: '1px solid rgba(45, 212, 191, 0.2)',
                      borderRadius: '10px',
                    }}
                  />
                </td>
                <td style={{ ...tdStyle, textAlign: 'left', color: 'var(--text-muted)' }}>
                  —
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  {pillBadge(newAuditors, 'teal')}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <button
                    onClick={handleAddManualRow}
                    style={{
                      border: 'none',
                      background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                      color: '#ffffff',
                      cursor: 'pointer',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    Add Row
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Action Bar — Dark Premium */}
      <div className="card" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        padding: '24px 28px',
        position: 'relative',
        width: '100%',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-lg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxSizing: 'border-box',
      }}>
        {/* Top accent line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3) 30%, rgba(99, 102, 241, 0.5) 50%, rgba(45, 212, 191, 0.3) 70%, transparent)',
        }} />

        {/* Form Title & Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(148, 163, 184, 0.08)', paddingBottom: '12px', marginBottom: '4px' }}>
          <Shield size={16} style={{ color: '#6366f1' }} />
          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Audit Execution Configuration
          </span>
        </div>

        {/* Responsive Inputs Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          width: '100%',
        }}>
          {/* Start Date */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>
              <Calendar size={12} /> Start Date <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              type="date"
              value={globalFields.startDate}
              onChange={(e) => {
                setGlobalFields(prev => ({ ...prev, startDate: e.target.value }));
                setValidationErrors(prev => ({ ...prev, startDate: false }));
              }}
              style={getDarkFieldStyle(validationErrors.startDate, { height: '38px', width: '100%', boxSizing: 'border-box' })}
            />
          </div>

          {/* End Date */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>
              <Calendar size={12} /> End Date <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              type="date"
              value={globalFields.endDate}
              onChange={(e) => {
                setGlobalFields(prev => ({ ...prev, endDate: e.target.value }));
                setValidationErrors(prev => ({ ...prev, endDate: false }));
                isEndDateCustomized.current = true;
              }}
              style={getDarkFieldStyle(validationErrors.endDate, { height: '38px', width: '100%', boxSizing: 'border-box' })}
            />
          </div>

          {/* Audit Type */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>
              <ClipboardList size={12} /> Audit Type <span style={{ color: '#f87171' }}>*</span>
            </label>
            <select
              value={globalFields.auditType}
              onChange={(e) => {
                setGlobalFields(prev => ({ ...prev, auditType: e.target.value }));
                setValidationErrors(prev => ({ ...prev, auditType: false }));
              }}
              style={getDarkFieldStyle(validationErrors.auditType, { height: '38px', width: '100%', boxSizing: 'border-box' })}
            >
              <option value="Internal Audit">Internal Audit</option>
              <option value="Process Review">Process Review</option>
              <option value="Agile Ad-hoc Audit">Agile Ad-hoc Audit</option>
            </select>
          </div>

          {/* Audit Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>
              <ClipboardList size={12} /> Audit Name <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Q3 Audit"
              value={globalFields.auditName || ''}
              onChange={(e) => {
                setGlobalFields(prev => ({ ...prev, auditName: e.target.value }));
                setValidationErrors(prev => ({ ...prev, auditName: false }));
              }}
              style={getDarkFieldStyle(validationErrors.auditName, { height: '38px', width: '100%', boxSizing: 'border-box' })}
            />
          </div>

          {/* Plant Multi-Select */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
            <label style={labelStyle}>
              <ClipboardList size={12} /> Plant
            </label>
            <button
              ref={plantButtonRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPlantDropdownOpen(!plantDropdownOpen);
              }}
              style={{
                ...getDarkFieldStyle(false, { height: '38px', width: '100%', boxSizing: 'border-box' }),
                background: 'var(--surface-muted)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                textAlign: 'left',
                padding: '6px 12px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '85%' }}>
                {globalFields.plants.length === 0 
                  ? 'Select Plants' 
                  : `${globalFields.plants.length} Selected`}
              </span>
              <ChevronDown size={14} />
            </button>
            
            {plantDropdownOpen && createPortal(
              <div 
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: `${plantDropdownCoords.top + 4}px`,
                  left: `${plantDropdownCoords.left}px`,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '10px',
                  zIndex: 9999,
                  maxHeight: '200px',
                  overflowY: 'auto',
                  minWidth: '220px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', paddingBottom: '4px', borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                  Select Plants
                </div>
                {plantsList.map(p => {
                  const isChecked = globalFields.plants.includes(p.code);
                  return (
                    <label 
                      key={p.code}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        fontSize: '12.5px', 
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const nextPlants = isChecked 
                            ? globalFields.plants.filter(code => code !== p.code)
                            : [...globalFields.plants, p.code];
                          setGlobalFields(prev => ({ ...prev, plants: nextPlants }));
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>{p.name}</span>
                    </label>
                  );
                })}
                {plantsList.length === 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                    No plants loaded
                  </div>
                )}
              </div>,
              document.body
            )}
          </div>

          {/* Lead Auditor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>
              <Users size={12} /> Lead Auditor
            </label>
            <input
              type="text"
              placeholder="Lead Auditor Name"
              value={globalFields.leadAuditor}
              onChange={(e) => {
                setGlobalFields(prev => ({ ...prev, leadAuditor: e.target.value }));
              }}
              style={getDarkFieldStyle(false, { height: '38px', width: '100%', boxSizing: 'border-box' })}
            />
          </div>

          {/* Department */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>
              <Users size={12} /> Department <span style={{ color: '#f87171' }}>*</span>
            </label>
            <select
              value={globalFields.department}
              onChange={(e) => {
                setGlobalFields(prev => ({ ...prev, department: e.target.value }));
                setValidationErrors(prev => ({ ...prev, department: false }));
              }}
              style={getDarkFieldStyle(validationErrors.department, { height: '38px', width: '100%', boxSizing: 'border-box' })}
            >
              <option value="Finance">Finance</option>
              <option value="IT">IT</option>
              <option value="Operations">Operations</option>
              <option value="HR">HR</option>
              <option value="Legal">Legal</option>
              <option value="Audit">Audit</option>
              <option value="Compliance">Compliance</option>
              <option value="Marketing">Marketing</option>
              <option value="Sales">Sales</option>
              <option value="Procurement">Procurement</option>
              <option value="Administration">Administration</option>
            </select>
          </div>

          {/* Audit Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>
              <ClipboardList size={12} /> Audit Description
            </label>
            <input
              type="text"
              placeholder="Audit Description..."
              value={globalFields.auditDescription}
              onChange={(e) => {
                setGlobalFields(prev => ({ ...prev, auditDescription: e.target.value }));
              }}
              style={getDarkFieldStyle(false, { height: '38px', width: '100%', boxSizing: 'border-box' })}
            />
          </div>
        </div>

        {/* Footer Actions Row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(148, 163, 184, 0.08)',
          width: '100%',
          boxSizing: 'border-box',
        }}>
          {/* Left Side: Summary or Status info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#6366f1',
              boxShadow: '0 0 8px #6366f1',
            }} />
            <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: '500' }}>
              Fields marked with <span style={{ color: '#f87171' }}>*</span> are required to launch.
            </span>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '12px',
          }}>
            {/* Create in Template Button */}
            <button
              onClick={handleCreateTemplate}
              disabled={isGenerating}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
                border: 'none',
                color: '#ffffff',
                padding: '0 20px',
                height: '38px',
                fontSize: '13px',
                fontWeight: '600',
                borderRadius: '20px',
                cursor: 'pointer',
                transition: 'all 0.22s cubic-bezier(.4,0,.2,1)',
                whiteSpace: 'nowrap',
                opacity: isGenerating ? 0.7 : 1,
                boxShadow: '0 4px 16px rgba(45, 212, 191, 0.25)',
              }}
              onMouseEnter={(e) => { if (!isGenerating) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { if (!isGenerating) e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <FileCheck size={15} />
              {isGenerating ? 'Generating...' : 'Create in Template'}
            </button>

            {/* Post to Production Button */}
            <button
              onClick={async () => {
                const uniqueAuditors = [...new Set(rows.flatMap(r => r.selectedAuditors || []))];
                const errors = {
                  startDate: !globalFields.startDate,
                  endDate: !globalFields.endDate,
                  auditors: uniqueAuditors.length === 0,
                  auditType: !globalFields.auditType,
                  auditName: !globalFields.auditName || !globalFields.auditName.trim(),
                  department: !globalFields.department,
                };
                setValidationErrors(errors);

                const hasErrors = Object.values(errors).some(Boolean);
                if (hasErrors) {
                  alert('Please resolve all validation errors in the audit details before posting to production.');
                  return;
                }

                setIsPosting(true);
                try {
                  const res = await fetch('/api/post-to-production', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      tenant_id: 'CJSJ',
                      global_fields: globalFields,
                      rows: rows,
                    }),
                  });
                  const data = await res.json();
                  if (data.success) {
                    alert(data.message || 'Audit plan successfully posted to production!');
                    navigate('/');
                  } else {
                    alert('Failed to post to production: ' + (data.error || 'Unknown error'));
                  }
                } catch (err) {
                  console.error(err);
                  alert('Error connecting to the server. Please check if the backend is running.');
                } finally {
                  setIsPosting(false);
                }
              }}
              disabled={isPosting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
                border: 'none',
                color: '#ffffff',
                padding: '0 20px',
                height: '38px',
                fontSize: '13px',
                fontWeight: '600',
                borderRadius: '20px',
                cursor: isPosting ? 'not-allowed' : 'pointer',
                transition: 'all 0.22s cubic-bezier(.4,0,.2,1)',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.25)',
                opacity: isPosting ? 0.7 : 1,
              }}
              onMouseEnter={(e) => { if (!isPosting) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { if (!isPosting) e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {isPosting ? (
                <Loader className="spinner" size={15} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <ArrowRight size={15} />
              )}
              {isPosting ? 'Posting...' : 'Post to Production'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Shared Table Style Constants ─────────────────────
const thStyle = {
  background: 'var(--surface-muted)',
  color: 'var(--text-secondary)',
  fontWeight: 700,
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  padding: '14px 18px',
  borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
  whiteSpace: 'nowrap',
  fontFamily: 'Inter, sans-serif',
  width: '40px',
};

const tdStyle = {
  padding: '14px 18px',
  borderBottom: '1px solid rgba(148, 163, 184, 0.06)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  verticalAlign: 'middle',
  fontFamily: 'Inter, sans-serif',
};

const labelStyle = {
  fontSize: '10px',
  fontWeight: '700',
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontFamily: 'Inter, sans-serif',
};

export default AuditPlanTable;
