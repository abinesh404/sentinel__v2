import pandas as pd
from utils.column_mapper import safe_str
import json
import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
KNOWLEDGE_DIR = os.path.join(BASE_DIR, "knowledge", "processed")
AUDIT_RULES_PATH = os.path.join(KNOWLEDGE_DIR, "audit_rules.json")
AUTOMATION_PATTERNS_PATH = os.path.join(KNOWLEDGE_DIR, "automation_patterns.json")

try:
    with open(AUDIT_RULES_PATH, "r") as f:
        AUDIT_RULES = json.load(f)
except Exception:
    AUDIT_RULES = []
    
try:
    with open(AUTOMATION_PATTERNS_PATH, "r") as f:
        AUTOMATION_PATTERNS = json.load(f)
except Exception:
    AUTOMATION_PATTERNS = []

def determine_severity_base(risk_text):
    text = str(risk_text).upper()
    if "HIGH" in text or "KEY" in text or "CRITICAL" in text:
        return 20, "High"
    if "LOW" in text or "MINOR" in text:
        return 5, "Low"
    return 10, "Medium"

def calculate_risk_score(type_text, freq_text, ctrl_text, risk_text, nature_text=""):
    t = str(type_text).upper()
    f = str(freq_text).upper()
    c = str(ctrl_text).upper()
    n = str(nature_text).upper()
    
    score = 0
    matched_rule = False
    
    # 1. Externalized Rule Engine
    for rule in AUDIT_RULES:
        rule_type = rule.get("control_type", "").upper()
        rule_freq = rule.get("frequency", "").upper()
        if rule_type in t and rule_freq in f:
            score += rule.get("risk_score", 0)
            matched_rule = True
            break
            
    # Fallback to legacy scoring if no exact rule matched
    if not matched_rule:
        if "MANUAL" in t:
            score += 20
        elif "SEMI" in t:
            score += 10
        if "DAILY" in f or "CONTINUOUS" in f:
            score += 25
        elif "WEEKLY" in f:
            score += 15
        elif "MONTHLY" in f:
            score += 5
        
    # Nature Score
    if "PREVENT" in n or "PREVENT" in c or "PREVENTIVE" in t:
        score += 10
        nature = "Preventive"
    elif "DETECT" in n:
        score += 5
        nature = "Detective"
    else:
        score += 5
        nature = nature_text.title() if nature_text else "Detective"

    # Base severity
    base_score, severity = determine_severity_base(risk_text)
    score += base_score
    
    # Process Criticality (simulated baseline)
    score += 15 
    
    # Cap at 100
    score = min(score, 100)
    
    if score >= 70:
        severity = "High"
    elif score >= 40:
        severity = "Medium"
    else:
        severity = "Low"
        
    return score, severity, nature

def determine_occurrence_type(freq_text, occurrence_text=""):
    if occurrence_text:
        return occurrence_text.title()
    f = str(freq_text).upper()
    if "DAILY" in f or "WEEKLY" in f or "MONTHLY" in f or "QUARTERLY" in f or "CONTINUOUS" in f:
        return "Recurring"
    return "One-off"

def determine_automation_potential(type_text, freq_text):
    t = str(type_text).upper()
    f = str(freq_text).upper()
    if "MANUAL" in t and ("DAILY" in f or "WEEKLY" in f or "CONTINUOUS" in f):
        return "High"
    if "SEMI" in t or "MONTHLY" in f:
        return "Medium"
    return "Low"

def determine_implementation_complexity(potential):
    if potential == "High":
        return "Medium (ERP Integration)"
    if potential == "Medium":
        return "Low (Workflow Only)"
    return "High (Major Process Redesign)"

def determine_priority(score):
    if score >= 70:
        return "High"
    if score >= 40:
        return "Medium"
    return "Low"

def determine_expected_benefit(type_text, freq_text, proc_text, ctrl_text):
    potential = determine_automation_potential(type_text, freq_text)
    
    # 1. Deterministic external rules (Pattern Matching)
    search_text = (str(proc_text) + " " + str(ctrl_text)).lower()
    for pattern in AUTOMATION_PATTERNS:
        keyword = pattern.get("keyword", "").lower()
        if keyword and keyword in search_text:
            return pattern.get("automation", "")
            
    # Fallback
    if potential == "High":
        return "Significant reduction in manual effort and human error"
    if potential == "Medium":
        return "Improved audit traceability and reduced approval delays"
    return "Streamlined exception reporting and monitoring"

def build_ai_suggestions(df=None, col_map=None):
    """Generate suggestions from Manufacturing_Strategic_RCM_Exact_Rationale.xlsx, ordered exactly by priority list and capped at 15 rows."""
    import pandas as pd
    import os
    import math
    
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    file_path = os.path.join(base_dir, "backend", "AI Suggestions data", "Manufacturing_Strategic_RCM_Exact_Rationale.xlsx")
    if not os.path.exists(file_path):
        return []
        
    try:
        # Load the 'Strategic RCM' sheet. Row index 2 in Excel is the headers row.
        xls_df = pd.read_excel(file_path, sheet_name='Strategic RCM', header=2)
    except Exception as e:
        print("Error reading suggestions Excel:", e)
        return []
        
    suggestions = []
    for idx, row in xls_df.iterrows():
        proc_raw = row.get('Risk Area')
        proc_text = str(proc_raw).strip() if pd.notnull(proc_raw) else ""
        
        risk_raw = row.get('Risk Description')
        risk_text = str(risk_raw).strip() if pd.notnull(risk_raw) else ""
        
        ctrl_raw = row.get('Control Activity / Description')
        ctrl_text = str(ctrl_raw).strip() if pd.notnull(ctrl_raw) else ""
        
        rationale_raw = row.get('Rationale')
        rationale_text = str(rationale_raw).strip() if pd.notnull(rationale_raw) else ""
        
        if not ctrl_text:
            continue
            
        suggestions.append({
            "Associated Risk": risk_text,
            "Process": proc_text,
            "Rationale": rationale_text,
            "Suggested Control": ctrl_text
        })
        
    # Sort based on the exact risk category order
    def get_risk_priority(risk_area_name):
        name = str(risk_area_name).strip().lower()
        if "cyber" in name:
            return 1
        if "digital" in name:
            return 2
        if "resilience" in name:
            return 3
        if "human" in name:
            return 4
        if "regulatory" in name:
            return 5
        if "geopolitical" in name:
            return 6
        if "financial" in name:
            return 7
        if "market" in name:
            return 8
        if "governance" in name:
            return 9
        if "culture" in name:
            return 10
        if "supply" in name:
            return 11
        if "fraud" in name or "corruption" in name:
            return 12
        if "communication" in name:
            return 13
        if "climate" in name:
            return 14
        if "health" in name:
            return 15
        if "mergers" in name:
            return 16
        return 999

    suggestions = sorted(suggestions, key=lambda x: get_risk_priority(x["Process"]))
    
    return suggestions[:15]
