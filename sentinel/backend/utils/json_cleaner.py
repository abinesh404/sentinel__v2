import math
import pandas as pd

def clean_json(obj):
    """
    Recursively iterates through data structures (dict, list, tuple) 
    and replaces NaN, Infinity, -Infinity with None to ensure JSON serialization safety.
    """
    if isinstance(obj, dict):
        return {k: clean_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_json(v) for v in obj]
    elif isinstance(obj, tuple):
        return tuple(clean_json(v) for v in obj)
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif pd.isna(obj):  # Handles pd.NA, np.nan, NaT, etc.
        return None
    else:
        return obj
