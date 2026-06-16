import re
import math
import pandas as pd

# Default mapping of standard keys to DataFrame column names (pre-mapped by column_mapper.py)
DEFAULT_COL_MAP = {
    "process": "process",
    "risk_description": "risk_description",
    "risk_classification": "risk_level",  # risk_engine.py populates 'risk_level' (HIGH, MEDIUM, LOW)
    "control_description": "control_description",
    "control_ref": "control_ref",
    "control_classification": "control_classification", # populated by control_classifier.py (MANUAL, AUTOMATED)
    "control_nature": "control_nature",
    "frequency": "frequency",
    "gaps": "gaps",
    "assessment": "assessment",
    "remarks": "remarks"
}

def _get_val(row, logical_name, col_map=None):
    """Safely retrieves a field value from a row based on logical name mapping."""
    mapping = col_map or DEFAULT_COL_MAP
    col_name = mapping.get(logical_name, logical_name)
    val = row.get(col_name) if col_name in row else row.get(logical_name)
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return ""
    return str(val).strip()

def calculate_row_indicators(row, col_map=None):
    """
    Determines which of the 10 risk indicators apply to a specific row.
    Returns a dictionary of boolean flags (0 or 1).
    """
    risk_desc = _get_val(row, "risk_description", col_map).lower()
    ctrl_desc = _get_val(row, "control_description", col_map).lower()
    risk_class = _get_val(row, "risk_classification", col_map).upper()
    ctrl_class = _get_val(row, "control_classification", col_map).upper()
    ctrl_nature = _get_val(row, "control_nature", col_map).lower()
    freq = _get_val(row, "frequency", col_map).lower()
    gaps = _get_val(row, "gaps", col_map).lower()
    assess = _get_val(row, "assessment", col_map).lower()
    remarks = _get_val(row, "remarks", col_map).lower()

    # 1. High-risk controls
    # Explicit 'HIGH' in level/classification, or calculated risk_score >= 70, or 'high' in risk text
    risk_score = float(row.get("risk_score", 0))
    is_high_risk = (risk_class == "HIGH" or risk_score >= 70 or "high risk" in risk_desc or "critical" in risk_desc)

    # 2. Manual controls
    is_manual = (ctrl_class == "MANUAL" or "manual" in ctrl_nature or "manual" in ctrl_desc)

    # 3. Recurring controls
    is_recurring = any(word in freq for word in ["daily", "weekly", "monthly", "quarterly", "semi", "annual", "recurring", "periodic", "every", "each"])

    # 4. Failed controls
    is_failed = any(word in assess for word in ["fail", "ineffective", "issue", "weak"]) or any(word in gaps for word in ["fail", "ineffective"])

    # 5. Missing approvals
    is_missing_approval = False
    if any(word in risk_desc or word in ctrl_desc for word in ["approval", "approve", "sign-off", "authorization", "authorize"]):
        if any(word in risk_desc or word in ctrl_desc or word in gaps for word in ["missing", "lack", "without", "no ", "not ", "absent", "fail"]):
            is_missing_approval = True

    # 6. Segregation-of-duty (SoD) conflicts
    is_sod = any(word in risk_desc or word in ctrl_desc for word in ["segregation of duty", "segregation of duties", "sod", "conflict", "dual role", "override", "maker-checker", "maker checker"])

    # 7. Fraud indicators
    is_fraud = any(word in risk_desc or word in ctrl_desc or word in remarks or word in gaps for word in ["fraud", "theft", "embezzle", "manipulate", "unauthorized transfer", "override", "collusion", "kickback", "siphoning", "laundering", "bribery", "corruption"])

    # 8. Missing evidence
    evidence_text = f"{gaps} {remarks} {ctrl_desc} {assess}".lower()
    is_missing_evidence = False
    if any(word in evidence_text for word in ["evidence", "documentation", "proof", "record"]):
        if any(word in evidence_text for word in ["no ", "missing", "lack", "without", "not ", "fail", "absent"]):
            is_missing_evidence = True

    # 9. Control gaps
    is_gap = (len(gaps.strip()) > 0 or "gap" in assess)

    # 10. Compliance issues
    is_compliance = any(word in risk_desc or word in ctrl_desc or word in gaps or word in remarks for word in ["compliance", "non-compliant", "violation", "regulatory", "penalty", "law", "act", "clause", "gdpr", "sox", "hipaa", "audit finding", "regulation"])

    return {
        "high_risk": int(is_high_risk),
        "manual": int(is_manual),
        "recurring": int(is_recurring),
        "failed": int(is_failed),
        "missing_approval": int(is_missing_approval),
        "sod": int(is_sod),
        "fraud": int(is_fraud),
        "missing_evidence": int(is_missing_evidence),
        "gap": int(is_gap),
        "compliance": int(is_compliance)
    }

def calculate_risk_scores(df, col_map=None):
    """
    Analyzes the entire DataFrame and groups results by process area.
    Calculates detailed metrics and normalized risk scores for each process.
    """
    mapping = col_map or DEFAULT_COL_MAP
    proc_col = mapping.get("process", "process")
    
    if df is None or df.empty or proc_col not in df.columns:
        return {}

    results = {}
    grouped = df.groupby(proc_col)

    for proc_name, group in grouped:
        if not proc_name or str(proc_name).strip() == "" or str(proc_name).lower() == "nan":
            continue
            
        total_controls = len(group)
        
        # Aggregate indicator flags
        high_risk_count = 0
        manual_controls = 0
        recurring_controls = 0
        failed_controls = 0
        missing_approvals = 0
        sod_conflicts = 0
        fraud_flags = 0
        missing_evidence = 0
        gap_controls = 0
        compliance_issues = 0

        for _, row in group.iterrows():
            ind = calculate_row_indicators(row, col_map)
            high_risk_count += ind["high_risk"]
            manual_controls += ind["manual"]
            recurring_controls += ind["recurring"]
            failed_controls += ind["failed"]
            missing_approvals += ind["missing_approval"]
            sod_conflicts += ind["sod"]
            fraud_flags += ind["fraud"]
            missing_evidence += ind["missing_evidence"]
            gap_controls += ind["gap"]
            compliance_issues += ind["compliance"]

        # Risk score calculation
        raw_score = (
            (high_risk_count * 40)
            + (manual_controls * 10)
            + (failed_controls * 20)
            + (gap_controls * 15)
            + (fraud_flags * 25)
            + (missing_approvals * 15)
        )

        # Dampened normalization to prevent over-dilution on larger processes
        denominator = max(1.0, min(total_controls, 3) * 1.25)
        risk_score = min(100, max(0, round(raw_score / denominator)))

        # Assign audit priority
        if risk_score >= 80:
            priority = "CRITICAL"
        elif risk_score >= 60:
            priority = "HIGH"
        elif risk_score >= 40:
            priority = "MEDIUM"
        else:
            priority = "LOW"

        results[proc_name] = {
            "process": proc_name,
            "total_controls": total_controls,
            "total_risks": len(group["risk_description"].dropna().unique()) if "risk_description" in group.columns else total_controls,
            "high_risk_controls": high_risk_count,
            "manual_controls": manual_controls,
            "recurring_controls": recurring_controls,
            "failed_controls": failed_controls,
            "missing_approvals": missing_approvals,
            "sod_conflicts": sod_conflicts,
            "fraud_indicators": fraud_flags,
            "missing_evidence": missing_evidence,
            "control_gaps": gap_controls,
            "compliance_issues": compliance_issues,
            "risk_score": risk_score,
            "audit_priority": priority
        }

    return results

def get_top_5_risks(df, col_map=None):
    """
    Returns only the Top 5 processes with the highest risk scores.
    Sorts descending and filters out low-risk categories (score < 10).
    """
    scores_dict = calculate_risk_scores(df, col_map)
    sorted_processes = sorted(scores_dict.values(), key=lambda x: x["risk_score"], reverse=True)
    
    # Filter out low risk categories (e.g. risk score < 10)
    top_5 = [p for p in sorted_processes if p["risk_score"] >= 10][:5]
    return top_5

def get_process_controls(df, process_name, col_map=None):
    """Filters and returns DataFrame rows associated with the given process area."""
    mapping = col_map or DEFAULT_COL_MAP
    proc_col = mapping.get("process", "process")
    if df is None or df.empty or proc_col not in df.columns:
        return pd.DataFrame()
    return df[df[proc_col] == process_name]

def get_process_risks(df, process_name, col_map=None):
    """Extracts unique risk descriptions for a specific process area."""
    sub = get_process_controls(df, process_name, col_map)
    risk_col = (col_map or DEFAULT_COL_MAP).get("risk_description", "risk_description")
    if sub.empty or risk_col not in sub.columns:
        return []
    return sub[risk_col].dropna().unique().tolist()

def generate_process_recommendations(df, process_name, col_map=None):
    """
    Generates deterministic, evidence-based recommendations,
    automation opportunities, and audit impact statements.
    """
    sub = get_process_controls(df, process_name, col_map)
    if sub.empty:
        return {
            "recommendations": ["No controls found to analyze."],
            "automation_opportunities": ["No automation opportunities identified."],
            "expected_audit_impact": "No expected impact."
        }

    total_controls = len(sub)
    ref_col = (col_map or DEFAULT_COL_MAP).get("control_ref", "control_ref")
    desc_col = (col_map or DEFAULT_COL_MAP).get("control_description", "control_description")
    risk_col = (col_map or DEFAULT_COL_MAP).get("risk_description", "risk_description")
    freq_col = (col_map or DEFAULT_COL_MAP).get("frequency", "frequency")

    failed_refs = []
    manual_refs = []
    gap_refs = []
    sod_refs = []
    fraud_refs = []
    missing_approval_refs = []

    for _, row in sub.iterrows():
        ind = calculate_row_indicators(row, col_map)
        ref = _get_val(row, "control_ref", col_map) or f"Row {row.name}"
        desc = _get_val(row, "control_description", col_map)
        
        if ind["failed"]:
            failed_refs.append((ref, desc))
        if ind["manual"]:
            freq = _get_val(row, "frequency", col_map) or "periodic"
            manual_refs.append((ref, desc, freq))
        if ind["gap"]:
            gap_text = _get_val(row, "gaps", col_map)
            gap_refs.append((ref, gap_text or desc))
        if ind["sod"]:
            sod_refs.append(ref)
        if ind["fraud"]:
            risk_text = _get_val(row, "risk_description", col_map)
            fraud_refs.append((ref, risk_text))
        if ind["missing_approval"]:
            missing_approval_refs.append(ref)

    # 1. AI Recommendations Logic
    recommendations = []
    if failed_refs:
        refs_str = ", ".join([r[0] for r in failed_refs[:3]])
        recommendations.append(
            f"Remediate failed controls ({refs_str}) immediately. Establish daily/weekly system automated validations "
            f"to enforce control effectiveness and prevent audit leakage."
        )
    if gap_refs:
        refs_str = ", ".join([r[0] for r in gap_refs[:3]])
        recommendations.append(
            f"Address documented control gaps in ({refs_str}). Implement dual authorization controls and update "
            f"the standard operating procedures (SOPs) to ensure operational completeness."
        )
    if sod_refs:
        refs_str = ", ".join(sod_refs[:3])
        recommendations.append(
            f"Resolve Segregation of Duties (SoD) conflicts identified in controls ({refs_str}). Restrict superuser "
            f"roles and define transaction-level approvals within the ERP configuration."
        )
    if fraud_refs:
        refs_str = ", ".join([r[0] for r in fraud_refs[:3]])
        recommendations.append(
            f"Deploy continuous transaction-monitoring analytics to flag exceptions and potential fraud indicators "
            f"associated with controls ({refs_str}). Establish independent managerial reviews for transaction thresholds."
        )
    if missing_approval_refs:
        refs_str = ", ".join(missing_approval_refs[:3])
        recommendations.append(
            f"Implement system-enforced workflow approvals for controls ({refs_str}) to ensure all high-value transactions "
            f"contain a documented digital signature and appropriate business justification."
        )
    
    # Fallback if everything is fully compliant
    if not recommendations:
        recommendations.append(
            f"All analyzed controls in {process_name} are operating effectively. Schedule annual reviews of control "
            f"thresholds to align with business operational growth."
        )

    # 2. Automation Opportunities
    automation_opps = []
    if manual_refs:
        # Prioritize recurring manual controls (daily, weekly, monthly)
        recurring_manual = [m for m in manual_refs if any(f in m[2].lower() for f in ["daily", "weekly", "monthly", "each", "every"])]
        candidates = recurring_manual if recurring_manual else manual_refs
        
        for ref, desc, freq in candidates[:3]:
            short_desc = desc[:60] + "..." if len(desc) > 60 else desc
            automation_opps.append(
                f"Automate {ref} ('{short_desc}'): Currently manual ({freq}). Transition this to a system-enforced "
                f"validation or script-based exception reporting to eliminate manual effort and human error."
            )
    else:
        automation_opps.append(
            f"All controls in {process_name} are automated or semi-automated. Maintain current configuration controls."
        )

    # 3. Expected Audit Impact
    score_data = calculate_risk_scores(df, col_map).get(process_name, {})
    current_score = score_data.get("risk_score", 0)
    failed_count = len(failed_refs)
    manual_count = len(manual_refs)
    
    # Impact score reduction estimation
    remediation_benefit = failed_count * 15 + manual_count * 5
    projected_score = max(5, current_score - remediation_benefit)
    saved_hours = max(10, total_controls * 5 + manual_count * 8)

    expected_audit_impact = (
        f"Remediating {failed_count} failed controls and automating {manual_count} manual controls in {process_name} "
        f"is projected to reduce the risk score from {current_score} to {projected_score} (a {current_score - projected_score} point risk reduction). "
        f"This will lower audit priority to '{'LOW' if projected_score < 40 else 'MEDIUM'}', improve compliance rating, "
        f"and save approximately {saved_hours} hours of manual audit testing annually."
    )

    return {
        "recommendations": recommendations,
        "automation_opportunities": automation_opps,
        "expected_audit_impact": expected_audit_impact
    }
