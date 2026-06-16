import pandas as pd
import numpy as np
import re

def _is_blank(value) -> bool:
    return value is None or (isinstance(value, float) and np.isnan(value)) or str(value).strip() == ""


def _merge_duplicate_control_refs(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    if "control_ref" not in df.columns:
        deduplicated = df.drop_duplicates()
        return deduplicated, len(df) - len(deduplicated)

    referenced = df[df["control_ref"].fillna("").astype(str).str.strip() != ""]
    unreferenced = df[df["control_ref"].fillna("").astype(str).str.strip() == ""]
    merged_rows = []

    for _, group in referenced.groupby("control_ref", sort=False, dropna=False):
        completeness = group.apply(
            lambda row: sum(not _is_blank(value) for value in row),
            axis=1,
        )
        base = group.loc[completeness.idxmax()].copy()
        for column in group.columns:
            if _is_blank(base[column]):
                candidates = group[column][~group[column].map(_is_blank)]
                if not candidates.empty:
                    base[column] = candidates.iloc[0]
        merged_rows.append(base)

    merged = pd.DataFrame(merged_rows, columns=df.columns)
    merged = pd.concat([merged, unreferenced], ignore_index=True)
    merged = merged.drop_duplicates()
    return merged, len(df) - len(merged)


def clean_data(df: pd.DataFrame, return_report: bool = False):
    """
    Cleans messy Excel data:
    1. Removes extra spaces from strings
    2. Standardizes cases (e.g. UPPERCASE for specific categorical columns)
    3. Handles empty cells (replaces NaN with empty string where appropriate)
    4. Removes duplicate rows
    5. Standardizes dates
    """
    
    # 1. Remove Extra Spaces & 3. Handle Empty Cells
    for col in df.columns:
        if df[col].dtype == object:
            # Replace NaN/None with empty string, convert to string
            df[col] = df[col].fillna("").astype(str)
            # Remove leading/trailing spaces and multiple spaces
            df[col] = df[col].apply(lambda x: re.sub(r'\s+', ' ', x.strip()) if isinstance(x, str) else x)
        else:
            # For numeric columns, just handle NaNs
            # df[col] = df[col].replace({np.nan: None})
            pass
            
    # 2. Standardize Cases
    # Frequencies should be UPPERCASE (if frequency column exists)
    if "frequency" in df.columns:
        df["frequency"] = df["frequency"].str.upper()
        
    # Standardize Control Type if exists
    if "control_type" in df.columns:
        df["control_type"] = df["control_type"].str.upper()

    # 4. Merge duplicate controls, retaining the most complete source record.
    df, duplicate_records_removed = _merge_duplicate_control_refs(df)
    
    # 5. Date Standardization
    if "date" in df.columns:
        # Convert to datetime, coercing errors to NaT, then format to string YYYY-MM-DD
        df["date"] = pd.to_datetime(df["date"], errors="coerce").dt.strftime('%Y-%m-%d')
        df["date"] = df["date"].fillna("")
        
    report = {
        "duplicate_records_removed": int(duplicate_records_removed),
    }
    if return_report:
        return df, report
    return df
