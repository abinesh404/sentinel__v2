import math
import pandas as pd
from utils.column_mapper import safe_str

def build_audit_plan(df, col_map):
    proc_col    = col_map.get("process")
    gap_col     = col_map.get("gaps")
    assess_col  = col_map.get("assessment")
    freq_col    = col_map.get("frequency")
    ct_col      = col_map.get("control_type")
    risk_col    = col_map.get("risk")
    rc_col      = col_map.get("risk_class")
    cn_col      = col_map.get("control_nature")
    ref_col     = col_map.get("control_ref")
    ctrl_col    = col_map.get("control")

    if not proc_col or proc_col not in df.columns:
        return []

    plan = []
    processes = df[proc_col].fillna("Unknown").unique()

    for proc in processes:
        if not safe_str(proc):
            continue
        sub = df[df[proc_col] == proc]
        total = len(sub)

        # Count gaps
        gap_count = 0
        if gap_col and gap_col in df.columns:
            gap_count = (sub[gap_col].notna() & (sub[gap_col].astype(str).str.strip() != "")).sum()

        # Count failed assessments
        failed = 0
        if assess_col and assess_col in df.columns:
            failed = sub[assess_col].fillna("").astype(str).str.lower().str.contains("gap|fail|ineffective|issue|weak").sum()

        # Manual control count
        manual = 0
        if ct_col and ct_col in df.columns:
            manual = sub[ct_col].fillna("").astype(str).str.lower().str.contains("manual").sum()

        row_scores = (
            pd.to_numeric(sub["risk_score"], errors="coerce").fillna(0)
            if "risk_score" in sub.columns
            else pd.Series([0] * total)
        )
        high_count = (
            sub["risk_level"].fillna("").astype(str).str.upper().eq("HIGH").sum()
            if "risk_level" in sub.columns
            else 0
        )
        risk_score = min(100, round(
            row_scores.mean() * 0.55
            + (high_count / max(total, 1)) * 30
            + (manual / max(total, 1)) * 15
            + (gap_count / max(total, 1)) * 20
            + (failed / max(total, 1)) * 20
        ))

        # Recommended man-hours: based on controls count + risk weight
        man_hours = max(20, round(total * 3 + (risk_score - 50) * 0.8))

        # Auditors: 1 per 25 hours
        auditors = max(1, math.ceil(man_hours / 25))

        # Risk area: use most-common risk description value
        risk_area = "Compliance & Control Coverage"
        if risk_col and risk_col in df.columns:
            vals = sub[risk_col].dropna()
            if len(vals):
                risk_area = safe_str(vals.iloc[0])[:80]

        # Nested controls for expandable rows
        ctrl_rows = []
        ctrl_cols_to_show = [c for c in [ref_col, ctrl_col, freq_col, ct_col, cn_col] if c and c in df.columns]
        for _, row in sub.iterrows():
            ctrl_row = {c: safe_str(row[c]) for c in ctrl_cols_to_show}
            if ctrl_row:
                ctrl_rows.append(ctrl_row)

        plan.append({
            "id":         f"PLAN_{safe_str(proc).replace(' ', '_')[:20]}",
            "process":    safe_str(proc),
            "riskArea":   risk_area,
            "riskScore":  risk_score,
            "manHours":   man_hours,
            "auditors":   auditors,
            "basis": {
                "controlCount": total,
                "highRiskCount": int(high_count),
                "manualCount": int(manual),
                "gapCount": int(gap_count),
            },
            "controls":   ctrl_rows,
            "nestedCols": ctrl_cols_to_show,
        })

    plan.sort(key=lambda x: x["riskScore"], reverse=True)
    return plan[:5]
