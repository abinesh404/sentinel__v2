import pandas as pd
import re


def _normalized(series: pd.Series) -> pd.Series:
    return (
        series.fillna("")
        .astype(str)
        .str.replace(r"\s+", " ", regex=True)
        .str.strip()
    )


def _is_valid_frequency(value: str) -> bool:
    if not value:
        return True

    normalized = value.lower().replace("annually", "annual").replace("yearly", "annual")
    allowed_phrases = {
        "daily",
        "weekly",
        "monthly",
        "quarterly",
        "annual",
        "semi-annual",
        "semi annual",
        "semi-annually",
        "continuous",
        "ongoing",
        "event based",
        "event-driven",
        "per transaction",
    }
    parts = [part.strip() for part in re.split(r"/|,", normalized) if part.strip()]
    return bool(parts) and all(part in allowed_phrases for part in parts)

def validate_data(df: pd.DataFrame) -> dict:
    """
    Detects bad audit data BEFORE AI processing.
    Returns a dict with errors, warnings, and the cleaned data records.
    """
    errors = []
    warnings = []
    
    # 5. Empty File Check
    if df.empty:
        errors.append("The uploaded file contains no data rows.")
        return {"errors": errors, "warnings": warnings, "cleaned_data": []}

    # 1. Required Field Validation
    # Enhanced required field validation: allow variations in naming (e.g., underscores, spaces, case)
    from utils.column_mapper import normalize_column_name
    required_fields = ["control_description"]
    # Create a mapping of normalized column names to actual column names
    norm_to_actual = {normalize_column_name(col): col for col in df.columns}
    missing_fields = []
    for field in required_fields:
        if field not in df.columns:
            # Check if a normalized version matches any column
            if field not in norm_to_actual:
                missing_fields.append(field)
    
    if missing_fields:
        errors.append(f"Missing required columns: {', '.join(missing_fields)}")

    if "risk_description" not in df.columns:
        warnings.append("Missing risk_description column; semantic matching will use available control/description text.")
        
    # Check for empty required fields in rows
    if "risk_description" in df.columns:
        empty_risks = (_normalized(df["risk_description"]) == "").sum()
        if empty_risks > 0:
            warnings.append(f"{empty_risks} rows are missing a risk description.")

    if "control_description" in df.columns:
        empty_controls = (_normalized(df["control_description"]) == "").sum()
        if empty_controls > 0:
            errors.append(f"{empty_controls} rows are missing a control description.")

    if "risk_number" in df.columns:
        missing_risk_numbers = (_normalized(df["risk_number"]) == "").sum()
        if missing_risk_numbers:
            warnings.append(f"{missing_risk_numbers} rows are missing a risk number.")

    if "owner" in df.columns:
        missing_owners = (_normalized(df["owner"]) == "").sum()
        if missing_owners:
            warnings.append(f"{missing_owners} rows are missing a control owner.")

    if "assessment" in df.columns:
        missing_assessments = (_normalized(df["assessment"]) == "").sum()
        if missing_assessments:
            warnings.append(f"{missing_assessments} rows are missing a design assessment result.")

    # 2. Duplicate Controls
    if "control_ref" in df.columns:
        refs = _normalized(df["control_ref"])
        duplicate_refs = refs[(refs != "") & refs.duplicated(keep=False)]
        if not duplicate_refs.empty:
            warnings.append(
                f"Found {duplicate_refs.nunique()} duplicated control references across "
                f"{len(duplicate_refs)} rows."
            )

    if "control_description" in df.columns:
        # Assuming empty control descriptions don't count as duplicates of each other
        controls = _normalized(df["control_description"])
        duplicates = controls[(controls != "") & controls.duplicated()]
        if not duplicates.empty:
            warnings.append(f"Found {len(duplicates)} duplicate control descriptions.")

    # 3. Invalid Frequency
    if "frequency" in df.columns:
        frequencies = _normalized(df["frequency"])
        invalid_freqs = sorted({value for value in frequencies if not _is_valid_frequency(value)})
        if len(invalid_freqs) > 0:
            warnings.append(f"Found non-standard frequencies: {', '.join(invalid_freqs)}.")

    if "control_type" in df.columns:
        allowed_types = {
            "manual",
            "automated",
            "semi-automated",
            "semi- automated",
            "semi automated",
            "automated / it dependent",
            "manual / automated",
        }
        invalid_types = sorted({
            value for value in _normalized(df["control_type"]).str.lower()
            if value and value not in allowed_types
        })
        if invalid_types:
            warnings.append(f"Found invalid control types: {', '.join(invalid_types)}.")

    if "risk_classification" in df.columns:
        classifications = {
            value.upper()
            for value in _normalized(df["risk_classification"])
            if value
        }
        severity_values = classifications & {"HIGH", "MEDIUM", "LOW"}
        key_values = classifications & {"KEY", "NON KEY", "NON-KEY"}
        if severity_values and key_values:
            warnings.append(
                "Risk Classification mixes severity values with Key/Non-Key designations."
            )

    # 4. Invalid Dates
    if "date" in df.columns:
        # data_cleaner handled dates by coercing bad ones to "" (from NaT)
        # So we can just check if any date parsing failed if we kept original, 
        # but since it's already cleaned, any "" that wasn't originally empty could be a warning.
        pass # Simplified for now, or could check format if date was just a string.

    records = df.to_dict(orient="records")
    
    return {
        "errors": errors,
        "warnings": warnings,
        "cleaned_data": records
    }
