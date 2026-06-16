import pandas as pd

def classify_controls(df: pd.DataFrame) -> pd.DataFrame:
    """
    Automatically identifies control classifications (MANUAL, AUTOMATED, SEMI-AUTOMATED)
    based on rule-based keyword logic, if not already provided.
    Adds a new column 'control_classification'.
    """
    if "control_classification" not in df.columns:
        df["control_classification"] = ""

    manual_keywords = ["manually", "review", "physical", "sign", "approval", "check", "inspect"]
    auto_keywords = ["system generated", "automatic", "auto", "workflow", "bot", "script", "interface", "system-generated"]

    def determine_class(row):
        existing_type = str(row.get("control_type", "")).lower()
        desc = str(row.get("control_description", "")).lower()
        
        # If already specified in control_type column from excel
        has_manual_type = "manual" in existing_type
        has_auto_type = any(term in existing_type for term in ["auto", "system", "interface", "it dependent"])
        if "semi" in existing_type or (has_manual_type and has_auto_type):
            return "SEMI-AUTOMATED"
        if has_auto_type:
            return "AUTOMATED"
        if has_manual_type:
            return "MANUAL"
        
        # Rule-based logic on description
        has_manual = any(kw in desc for kw in manual_keywords)
        has_auto = any(kw in desc for kw in auto_keywords)
        
        if has_manual and has_auto:
            return "SEMI-AUTOMATED"
        elif has_auto:
            return "AUTOMATED"
        elif has_manual:
            return "MANUAL"
            
        return "UNKNOWN"  # Default — do not inflate MANUAL count

    df["control_classification"] = df.apply(determine_class, axis=1)
    
    return df
