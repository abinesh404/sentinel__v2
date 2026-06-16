import pandas as pd


def _text(series: pd.Series) -> pd.Series:
    return series.fillna("").astype(str).str.strip()


def _control_label(row: pd.Series) -> str:
    ref = str(row.get("control_ref", "")).strip()
    process = str(row.get("process", "Unknown process")).strip() or "Unknown process"
    return f"{ref or 'Unreferenced control'} ({process})"


def analyze_dataset_metrics(df: pd.DataFrame, kpis: dict, charts: dict) -> dict:
    """Build a deterministic, evidence-grounded executive analysis."""
    total = int(kpis.get("totalControls", len(df)))
    manual = int(kpis.get("manualControls", 0))
    automated = int(kpis.get("automatedControls", 0))
    semi = int(kpis.get("semiAutomatedControls", 0))
    high_df = (
        df[_text(df["risk_level"]).str.upper() == "HIGH"]
        if "risk_level" in df.columns
        else df.iloc[0:0]
    )
    high_count = len(high_df)
    manual_pct = round((manual / max(total, 1)) * 100, 1)

    process_stats = []
    if "process" in df.columns:
        for process, group in df.groupby("process", dropna=False):
            group_manual = (
                _text(group["control_classification"]).str.upper().eq("MANUAL").sum()
                if "control_classification" in group.columns
                else 0
            )
            group_high = (
                _text(group["risk_level"]).str.upper().eq("HIGH").sum()
                if "risk_level" in group.columns
                else 0
            )
            average_score = (
                pd.to_numeric(group["risk_score"], errors="coerce").fillna(0).mean()
                if "risk_score" in group.columns
                else 0
            )
            process_stats.append({
                "process": str(process).strip() or "Unknown",
                "controls": len(group),
                "manual": int(group_manual),
                "high": int(group_high),
                "average_score": round(float(average_score), 1),
            })
    process_stats.sort(
        key=lambda item: (item["high"], item["average_score"], item["manual"]),
        reverse=True,
    )
    top_process = process_stats[0] if process_stats else None

    if high_count:
        high_refs = ", ".join(
            str(value)
            for value in high_df.get("control_ref", pd.Series(dtype=str)).head(3)
            if str(value).strip()
        )
        key_risk_1 = (
            f"{high_count} controls are classified HIGH"
            + (f": {high_refs}." if high_refs else ".")
        )
    else:
        key_risk_1 = "No controls are classified HIGH under the current scoring rules."

    if top_process:
        key_risk_2 = (
            f"{top_process['process']} ranks first by current audit-priority inputs "
            f"({top_process['high']} high-risk, {top_process['manual']} manual, "
            f"{top_process['controls']} total controls)."
        )
    else:
        key_risk_2 = "Process-level risk concentration cannot be calculated from the uploaded dataset."

    classifications = _text(
        df.get("control_classification", pd.Series("", index=df.index))
    ).str.upper()
    automation_candidates = df[
        classifications.isin(["MANUAL", "SEMI-AUTOMATED"])
    ].copy()
    if "frequency" in automation_candidates.columns:
        recurring = _text(automation_candidates["frequency"]).str.contains(
            "DAILY|WEEKLY|MONTHLY|QUARTERLY|CONTINUOUS",
            case=False,
            regex=True,
        )
        automation_candidates = pd.concat(
            [automation_candidates[recurring], automation_candidates[~recurring]]
        )

    opportunities = []
    for _, row in automation_candidates.head(2).iterrows():
        frequency = str(row.get("frequency", "")).strip() or "unspecified frequency"
        opportunities.append(
            f"Assess workflow or exception-report automation for {_control_label(row)}, "
            f"currently {str(row.get('control_classification', '')).lower()} "
            f"and {frequency.lower()}."
        )
    if not opportunities:
        opportunities = [
            "No supported automation opportunity was identified from the uploaded control fields."
        ]

    priorities = [
        (
            f"Prioritize {item['process']}: {item['high']} high-risk controls, "
            f"{item['manual']} manual controls, average risk score {item['average_score']}."
        )
        for item in process_stats[:2]
    ]
    if not priorities:
        priorities = [
            "Audit priority cannot be calculated because process data is unavailable."
        ]

    predominant = "predominantly manual" if manual > total / 2 else "not predominantly manual"
    
    executive_summary = (
        f"The analyzed Risk Control Matrix encompasses {total} unique controls across {kpis.get('processCount', 0)} processes. "
        f"The control landscape is {predominant}, featuring {manual} manual controls, "
        f"{semi} semi-automated controls, and {automated} automated controls. "
    )
    if high_count > 0:
        executive_summary += f"Current scoring models indicate {high_count} high-risk controls requiring prioritization."
    else:
        executive_summary += "No controls are currently designated as high-risk under standard metrics."

    return {
        "executive_summary": executive_summary,
        "key_risks": [key_risk_1, key_risk_2],
        "automation_opportunities": opportunities,
        "audit_priorities": priorities,
        "grounding": {
            "source": "uploaded_rcm",
            "controlsEvaluated": total,
            "highRiskControls": high_count,
            "manualControls": manual,
        },
    }
