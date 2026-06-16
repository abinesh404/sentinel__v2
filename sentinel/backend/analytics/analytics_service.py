import math
import pandas as pd
from utils.column_mapper import safe_str

def get_normalized_counts(df, col_name, fallback_val):
    if not col_name or col_name not in df.columns:
        return {"labels": [], "data": []}
    
    # Fill NA with fallback_val, convert to string, strip whitespace
    series = df[col_name].fillna(fallback_val).astype(str).str.strip()
    
    # Replace empty strings (after strip) with fallback_val
    series = series.replace("", fallback_val)
    
    # Count original (stripped) values
    from collections import Counter
    counts = Counter(series)
    
    # Group by lowercase representation to consolidate different casings
    lower_groups = {}
    for orig_val, count in counts.items():
        low = orig_val.lower()
        if low not in lower_groups:
            lower_groups[low] = {"count": 0, "reprs": Counter()}
        lower_groups[low]["count"] += count
        lower_groups[low]["reprs"][orig_val] += count
        
    # Sort groups by count descending
    sorted_groups = sorted(lower_groups.items(), key=lambda x: x[1]["count"], reverse=True)
    
    labels = []
    data = []
    for low, info in sorted_groups:
        most_common_orig = info["reprs"].most_common(1)[0][0]
        
        # Standardize known words for polished UI
        if low == "manual":
            label = "Manual"
        elif low == "automated":
            label = "Automated"
        elif low in ("semi-automated", "semi automated", "semiautomated"):
            label = "Semi-Automated"
        elif low == "unspecified":
            label = "Unspecified"
        elif low == "unknown":
            label = "Unknown"
        else:
            if most_common_orig.islower():
                label = most_common_orig.title()
            else:
                label = most_common_orig
                
        labels.append(label)
        data.append(info["count"])
        
    return {
        "labels": labels,
        "data": data,
    }

def build_chart_data(df, col_map):
    charts = {}

    # Controls by Process
    proc_col = col_map.get("process")
    charts["byProcess"] = get_normalized_counts(df, proc_col, "Unknown")

    # Controls by Risk Classification
    rc_col = col_map.get("risk_class")
    if rc_col and rc_col in df.columns:
        charts["byRisk"] = get_normalized_counts(df, rc_col, "Unclassified")
    else:
        # Fallback: try to derive from risk column keywords
        charts["byRisk"] = {"labels": ["Key", "Non-Key"], "data": [0, 0]}

    # Controls by Type
    ct_col = col_map.get("control_type")
    charts["byType"] = get_normalized_counts(df, ct_col, "Unspecified")

    # Controls by Nature (for secondary doughnut segment)
    cn_col = col_map.get("control_nature")
    charts["byNature"] = get_normalized_counts(df, cn_col, "Other")

    # Gap Analysis — top risks from risk description
    risk_col = col_map.get("risk")
    gap_col  = col_map.get("gaps")
    if gap_col and gap_col in df.columns:
        gap_mask = df[gap_col].notna() & (df[gap_col].astype(str).str.strip() != "")
        gap_df = df[gap_mask]
        if proc_col and proc_col in df.columns:
            normalized_proc = get_normalized_counts(gap_df, proc_col, "Unknown")
            charts["topRisks"] = {
                "labels": normalized_proc["labels"][:6],
                "data": normalized_proc["data"][:6],
            }
        elif risk_col and risk_col in df.columns:
            temp_series = gap_df[risk_col].astype(str).str[:40]
            temp_df = pd.DataFrame({"temp_risk": temp_series})
            normalized_risk = get_normalized_counts(temp_df, "temp_risk", "Unknown")
            charts["topRisks"] = {
                "labels": normalized_risk["labels"][:6],
                "data": normalized_risk["data"][:6],
            }
        else:
            charts["topRisks"] = {"labels": [], "data": []}
    else:
        charts["topRisks"] = {"labels": [], "data": []}

    # Fraud schemes — group by control classification
    cc_col = col_map.get("classification")
    if cc_col and cc_col in df.columns:
        normalized_cc = get_normalized_counts(df, cc_col, "General")
        charts["fraudSchemes"] = {
            "labels": normalized_cc["labels"][:6],
            "data": normalized_cc["data"][:6]
        }
    else:
        charts["fraudSchemes"] = {"labels": [], "data": []}

    return charts

def compute_kpis(df, col_map):
    total = len(df)

    gap_col    = col_map.get("gaps")
    assess_col = col_map.get("assessment")
    ct_col     = col_map.get("control_type")
    proc_col   = col_map.get("process")

    gaps = 0
    if gap_col and gap_col in df.columns:
        gaps += (df[gap_col].notna() & (df[gap_col].astype(str).str.strip() != "")).sum()
    if assess_col and assess_col in df.columns:
        gaps += (df[assess_col].fillna("").astype(str).str.lower().str.contains("gap|fail|ineffective")).sum()
    gaps = min(gaps, total)

    automated = 0
    semi = 0
    manual = 0
    if ct_col and ct_col in df.columns:
        ct_series = df[ct_col].astype(str).str.strip().str.upper()
        manual = int((ct_series == "MANUAL").sum())
        semi = int(ct_series.str.contains("SEMI").sum())
        automated = int((ct_series == "AUTOMATED").sum())
        
        # Any fully unclassified control is defensively assumed manual
        classified = semi + automated + manual
        if classified < total:
            manual += (total - classified)

    processes = 0
    if proc_col and proc_col in df.columns:
        processes = df[proc_col].nunique()

    rc_col = col_map.get("risk_classification")
    high_risks = 0
    if rc_col and rc_col in df.columns:
        high_risks = int(df[rc_col].fillna("").astype(str).str.upper().str.contains("HIGH").sum())

    effectiveness = round(((total - gaps) / max(total, 1)) * 100, 1)
    automation_rate = round(((automated + semi) / max(total, 1)) * 100, 1)

    return {
        "totalControls":         total,
        "designGaps":            int(gaps),
        "automationRate":        automation_rate,
        "effectiveness":         effectiveness,
        "processCount":          int(processes),
        "automatedControls":     automated,
        "semiAutomatedControls": semi,
        "manualControls":        manual,
        "totalRisks":            total, # Usually 1 risk per control line
        "highRisks":             high_risks,
    }

def generate_analytics(df, col_map):
    return {
        "kpis": compute_kpis(df, col_map),
        "charts": build_chart_data(df, col_map)
    }
