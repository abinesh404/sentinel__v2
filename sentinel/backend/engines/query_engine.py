import pandas as pd

def execute_analytics_query(df: pd.DataFrame, intent: str, entities: dict) -> dict:
    """
    Translates intent and entities into a dataframe operation.
    Returns structured results for Context Builder.
    """
    if df is None or df.empty:
        return {"error": "No data available."}
        
    filtered_df = df.copy()
    
    # 1. Apply Filters based on entities
    if entities.get("risk_level"):
        if "risk_level" in filtered_df.columns:
            # Handle potential NaN values
            filtered_df = filtered_df[filtered_df["risk_level"].fillna("").str.upper() == entities["risk_level"]]
            
    if entities.get("process"):
        if "process" in filtered_df.columns:
            # Case insensitive match
            filtered_df = filtered_df[filtered_df["process"].fillna("").str.contains(entities["process"], case=False, na=False)]
            
    if entities.get("control_type"):
        col_to_check = "control_classification" if "control_classification" in filtered_df.columns else ("control_type" if "control_type" in filtered_df.columns else None)
        if col_to_check:
            filtered_df = filtered_df[filtered_df[col_to_check].fillna("").str.contains(entities["control_type"], case=False, na=False)]

    target = entities.get("target", "control")

    def result_count(frame: pd.DataFrame) -> int:
        if target == "risk":
            risk_number = frame.get("risk_number", pd.Series("", index=frame.index)).fillna("").astype(str).str.strip()
            risk_description = frame.get("risk_description", pd.Series("", index=frame.index)).fillna("").astype(str).str.strip()
            keys = risk_number.where(risk_number != "", risk_description)
            return int(keys.replace("", pd.NA).nunique())
        if "control_ref" in frame.columns:
            return int(frame["control_ref"].replace("", pd.NA).nunique())
        return len(frame)

    # 2. Execute Intent Action
    if intent == "COUNT_QUERY":
        return {
            "result_type": "count",
            "count": result_count(filtered_df),
            "target": target,
            "filters_applied": entities
        }
        
    elif intent == "FILTER_QUERY":
        # Limit rows to avoid massive payload/token overflow
        sample = filtered_df.head(10).to_dict(orient="records")
        return {
            "result_type": "list",
            "count": result_count(filtered_df),
            "target": target,
            "records": sample,
            "filters_applied": entities
        }
        
    elif intent in ["SUMMARY_QUERY", "RECOMMENDATION_QUERY", "GENERAL_QUERY"]:
        # Return basic stats for Ollama to summarize
        risk_dist = {}
        if "risk_level" in filtered_df.columns:
            risk_dist = filtered_df["risk_level"].fillna("Unknown").value_counts().to_dict()
            
        process_dist = {}
        if "process" in filtered_df.columns:
            process_dist = filtered_df["process"].fillna("Unknown").value_counts().head(5).to_dict()
            
        return {
            "result_type": "summary_stats",
            "count": result_count(filtered_df),
            "target": target,
            "risk_distribution": risk_dist,
            "top_processes": process_dist,
            "filters_applied": entities,
            "sample_records": filtered_df.head(5).to_dict(orient="records")
        }
        
    return {"error": "Unknown intent"}
