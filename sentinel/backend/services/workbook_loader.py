import re
from pathlib import Path

import pandas as pd


def _normalize_header(value) -> str:
    return re.sub(r"\s+", " ", str(value)).strip()


def _coalesce_duplicate_columns(df: pd.DataFrame) -> pd.DataFrame:
    if not df.columns.duplicated().any():
        return df

    result = pd.DataFrame(index=df.index)
    for column in dict.fromkeys(df.columns):
        matches = df.loc[:, df.columns == column]
        if matches.shape[1] == 1:
            result[column] = matches.iloc[:, 0]
            continue

        normalized = matches.replace(r"^\s*$", pd.NA, regex=True)
        result[column] = normalized.bfill(axis=1).iloc[:, 0]
    return result


def read_tabular_file(file_path: str) -> tuple[pd.DataFrame, dict]:
    path = Path(file_path)
    if path.suffix.lower() == ".csv":
        try:
            df = pd.read_csv(path, encoding="utf-8")
        except UnicodeDecodeError:
            # Fallback for Windows CSV files with alternative encoding
            df = pd.read_csv(path, encoding="latin1")
        return df, {
            "sheets_processed": ["CSV"],
            "sheet_row_counts": {"CSV": len(df)},
            "malformed_headers": [],
            "raw_rows": len(df),
        }

    sheets = pd.read_excel(path, sheet_name=None, engine="openpyxl")
    frames = []
    malformed_headers = []
    sheet_row_counts = {}

    for sheet_name, sheet_df in sheets.items():
        sheet_df = sheet_df.replace(r'^\s*$', pd.NA, regex=True).dropna(how="all").dropna(axis=1, how="all").copy()
        if sheet_df.empty:
            continue

        original_headers = [str(column) for column in sheet_df.columns]
        normalized_headers = [_normalize_header(column) for column in sheet_df.columns]
        malformed_headers.extend(
            f"{sheet_name}: {original!r}"
            for original, normalized in zip(original_headers, normalized_headers)
            if original != normalized
        )

        sheet_df.columns = normalized_headers
        sheet_df = _coalesce_duplicate_columns(sheet_df)
        sheet_row_counts[sheet_name] = len(sheet_df)
        frames.append(sheet_df)

    if not frames:
        return pd.DataFrame(), {
            "sheets_processed": [],
            "sheet_row_counts": {},
            "malformed_headers": malformed_headers,
            "raw_rows": 0,
        }

    combined = pd.concat(frames, ignore_index=True, sort=False)
    return combined, {
        "sheets_processed": list(sheet_row_counts),
        "sheet_row_counts": sheet_row_counts,
        "malformed_headers": malformed_headers,
        "raw_rows": len(combined),
    }
