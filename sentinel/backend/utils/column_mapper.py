import re
from difflib import SequenceMatcher

STANDARD_FIELDS = {
    "risk_description": [],
    "risk_number": [],
    "control_description": [],
    "frequency": [],
    "process": [],
    "owner": [],
    "control_type": [],
    "control_nature": [],
    "amount": [],
    "date": [],
    "control_ref": [],
    "assessment": [],
    "gaps": []
}

# The synonyms are ordered by specificity/preference.
# More specific terms (e.g. "control activity frequency") come before generic ones (e.g. "occurance").
COLUMN_SYNONYMS = {
    "risk_description": [
        "risk description", "risk desc", "risk statement", "risk summary", 
        "potential risk", "risk details", "risk",
        "risk discription", "risk_discription", "risk descriptios",
        "risk descriptuhave", "risk discprios"
    ],
    "risk_number": [
        "risk number", "risk no", "risk id", "risk reference", "risk ref"
    ],
    "risk_classification": [
        "risk classification", "risk level", "risk rating", "risk class"
    ],
    "control_description": [
        "control description", "control activity description", "control desc", 
        "control activity", "control statement", "control name", "control",
        "description", "desc", "discription", "descriptios", "descriptuhave",
        "discprios", "insight", "insights", "control discription",
        "control descriptios", "control descriptuhave", "control discprios"
    ],
    "frequency": [
        "control frequency", "testing frequency", "control activity frequency",
        "frequency", "freq"
    ],
    "occurrence": [
        "occurrence", "occurance"
    ],
    "process": [
        "process name", "business process", "sub process", "business area", 
        "department", "business unit", "process"
    ],
    "owner": [
        "control owner", "performed by", "responsible person", 
        "control performed by", "performer", "owner"
    ],
    "control_category": [
        "control classification"
    ],
    "control_classification": [
        "automation status", "automation"
    ],
    "control_type": [
        "control type", "type of control", "control category", "type"
    ],
    "control_nature": [
        "control nature", "nature of control", "nature"
    ],
    "amount": [
        "transaction amount", "high value", "amount", "value"
    ],
    "date": [
        "date of control", "testing date", "date"
    ],
    "control_ref": [
        "control ref no", "control id", "ref no", "control reference", "control ref"
    ],
    "assessment": [
        "design assessment result", "design assessment", "result", "conclusion", "assessment"
    ],
    "operating_effectiveness": [
        "operating effectiveness", "effectiveness"
    ],
    "gaps": [
        "gaps noted if any", "gaps noted", "gap", "gaps", "finding", "observation", "deficiency"
    ],
    "data_request": [
        "data request"
    ],
    "remarks": [
        "remarks", "comments", "notes"
    ]
}

def normalize_column_name(col_name: str) -> str:
    """Normalizes a single column name by lowercasing and stripping spaces/special chars."""
    if not isinstance(col_name, str):
        return str(col_name)
    # Lowercase
    c = col_name.lower()
    # Replace non-alphanumeric characters with spaces to prevent words from sticking together
    c = re.sub(r'[^a-z0-9\s]', ' ', c)
    # Normalize multiple spaces into single space and strip
    c = re.sub(r'\s+', ' ', c).strip()
    return c

def _looks_like_description(norm: str) -> bool:
    """Catch common misspellings of description without relying on every exact typo."""
    compact = norm.replace(" ", "")
    tokens = norm.split()
    description_words = {"description", "descriptios", "discription", "discprios", "descriptuhave"}
    if compact in {"desc", "insight", "insights"}:
        return True
    if any(token in description_words for token in tokens):
        return True
    return SequenceMatcher(None, compact, "description").ratio() >= 0.74

def _infer_description_key(norm: str) -> str | None:
    if not _looks_like_description(norm):
        return None
    if "risk" in norm:
        return "risk_description"
    return "control_description"

def map_columns(df):
    """
    Renames the columns of the dataframe to standard fields where possible.
    Resolves duplicates by prioritizing the most specific synonym matches.
    Returns the dataframe and a mapping dictionary.
    """
    # 1. Find all columns matching standard keys along with their synonym index
    matches = {} # standard_key -> list of (original_col, synonym_index)
    
    for original_col in df.columns:
        norm = normalize_column_name(original_col)
        for standard_key, synonyms in COLUMN_SYNONYMS.items():
            if norm in synonyms:
                syn_idx = synonyms.index(norm)
                if standard_key not in matches:
                    matches[standard_key] = []
                matches[standard_key].append((original_col, syn_idx))
                break # Move to next column once matched
        else:
            inferred_key = _infer_description_key(norm)
            if inferred_key:
                if inferred_key not in matches:
                    matches[inferred_key] = []
                matches[inferred_key].append((original_col, 999))
                
    # 2. Resolve duplicates: for each standard key, keep the best match
    final_mapping = {} # original_col -> standard_key
    for standard_key, col_matches in matches.items():
        # Sort by synonym_index (lower is better)
        col_matches.sort(key=lambda x: x[1])
        best_col = col_matches[0][0]
        final_mapping[best_col] = standard_key
        
    # 3. Rename columns and compile mapping
    new_cols = []
    mapping = {}
    for original_col in df.columns:
        mapped_key = final_mapping.get(original_col, original_col)
        new_cols.append(mapped_key)
        mapping[original_col] = mapped_key
        
    df.columns = new_cols
    return df, mapping

import math

def safe_str(val):
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return ""
    return str(val).strip()
