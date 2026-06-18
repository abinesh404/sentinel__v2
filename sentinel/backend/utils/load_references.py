import os
import pandas as pd
from sqlalchemy import create_engine

# DB URL for sentinel_db
DB_URL = "postgresql://postgres:postgres@192.168.1.66:5432/sentinel_db"

def main():
    engine = create_engine(DB_URL)
    print("Database engine created successfully.")

    # 1. Load d:\report page\backend\reffrence\Audit Plan.xlsx (Sheet1) -> ref_audit_plan
    ref_audit_plan_path = r"d:\report page\backend\reffrence\Audit Plan.xlsx"
    if os.path.exists(ref_audit_plan_path):
        print(f"Loading {ref_audit_plan_path}...")
        df = pd.read_excel(ref_audit_plan_path, sheet_name="Sheet1")
        df.to_sql("ref_audit_plan", engine, if_exists="replace", index=False)
        print("Loaded ref_audit_plan successfully.")
    else:
        print(f"Error: {ref_audit_plan_path} not found.")

    # 2. Load d:\compliBear\sentinel\source_data\Plant.xlsx -> ref_plant
    ref_plant_path = r"d:\compliBear\sentinel\source_data\Plant.xlsx"
    if os.path.exists(ref_plant_path):
        print(f"Loading {ref_plant_path}...")
        df = pd.read_excel(ref_plant_path)
        df.to_sql("ref_plant", engine, if_exists="replace", index=False)
        print("Loaded ref_plant successfully.")
    else:
        print(f"Error: {ref_plant_path} not found.")

    # 3. Load d:\compliBear\sentinel\source_data\Risk Analytics (3).xlsx -> ref_global_risk, ref_industry_risk, ref_industry_fraud
    ref_analytics_path = r"d:\compliBear\sentinel\source_data\Risk Analytics (3).xlsx"
    if os.path.exists(ref_analytics_path):
        print(f"Loading {ref_analytics_path}...")
        xls = pd.ExcelFile(ref_analytics_path)
        
        df_global = pd.read_excel(xls, "Global Risk")
        df_global.to_sql("ref_global_risk", engine, if_exists="replace", index=False)
        print("Loaded ref_global_risk successfully.")

        df_ind = pd.read_excel(xls, "Industry Wise Risk")
        df_ind.to_sql("ref_industry_risk", engine, if_exists="replace", index=False)
        print("Loaded ref_industry_risk successfully.")

        df_fraud = pd.read_excel(xls, "Indusrty Wise Fraud Schemes", skiprows=2)
        df_fraud.to_sql("ref_industry_fraud", engine, if_exists="replace", index=False)
        print("Loaded ref_industry_fraud successfully.")
    else:
        print(f"Error: {ref_analytics_path} not found.")

    # 4. Load d:\compliBear\sentinel\backend\AI Suggestions data\Manufacturing_Strategic_RCM_Exact_Rationale.xlsx -> ref_suggestions
    ref_sug_path = r"d:\compliBear\sentinel\backend\AI Suggestions data\Manufacturing_Strategic_RCM_Exact_Rationale.xlsx"
    if os.path.exists(ref_sug_path):
        print(f"Loading {ref_sug_path}...")
        df = pd.read_excel(ref_sug_path, sheet_name='Strategic RCM', header=2)
        df.to_sql("ref_suggestions", engine, if_exists="replace", index=False)
        print("Loaded ref_suggestions successfully.")
    else:
        print(f"Error: {ref_sug_path} not found.")

    # 5. Load d:\compliBear\sentinel\backend\AI Suggestions data\Master data for Auditors.xlsx -> ref_auditors
    ref_auditors_path = r"d:\compliBear\sentinel\backend\AI Suggestions data\Master data for Auditors.xlsx"
    if os.path.exists(ref_auditors_path):
        print(f"Loading {ref_auditors_path}...")
        df = pd.read_excel(ref_auditors_path)
        df.to_sql("ref_auditors", engine, if_exists="replace", index=False)
        print("Loaded ref_auditors successfully.")
    else:
        print(f"Error: {ref_auditors_path} not found.")

if __name__ == "__main__":
    main()
