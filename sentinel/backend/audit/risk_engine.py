import pandas as pd
import re

def detect_risks(df: pd.DataFrame) -> pd.DataFrame:
    """
    Detects high-risk controls and generates a risk score and risk level.
    """
    if "risk_score" not in df.columns:
        df["risk_score"] = 0
    if "risk_level" not in df.columns:
        df["risk_level"] = ""

    def calculate_risk(row):
        score = 0
        risk_desc = str(row.get("risk_description", "")).lower()
        classification = str(row.get("control_classification", "")).upper()
        source_classification = str(row.get("risk_classification", "")).strip().upper()
        
        # Condition 1: Manual controls are inherently riskier
        if classification == "MANUAL":
            score += 20
        elif classification == "SEMI-AUTOMATED":
            score += 10
            
        # Condition 2: Missing approvals/segregation
        if (
            "missing approval" in risk_desc
            or "segregation" in risk_desc
            or re.search(r"\bsod\b", risk_desc)
        ):
            score += 30
            
        # Condition 3: High value or financial impact
        if (
            "high amount" in risk_desc
            or re.search(r"\bhigh[- ]value\b", risk_desc)
            or re.search(r"\bjournal\b", risk_desc)
        ):
            score += 40
            
        # Condition 4: Gaps or findings
        gaps = str(row.get("gaps", "")).strip()
        if gaps:
            score += 30
            
        # Explicit source severity is authoritative when present.
        if source_classification == "HIGH":
            score = max(score, 80)
        elif source_classification == "MEDIUM":
            score = max(score, 50)
        elif source_classification == "LOW":
            score = max(score, 20)

        # Cap score at 100
        score = min(score, 100)
        
        if score >= 70:
            level = "HIGH"
        elif score >= 40:
            level = "MEDIUM"
        else:
            level = "LOW"
            
        return pd.Series([score, level])

    # Apply scoring
    df[["risk_score", "risk_level"]] = df.apply(calculate_risk, axis=1)
    
    return df
