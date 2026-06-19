import pandas as pd
from sqlalchemy import create_engine, event
import os

# Connecting to your remote server
DB_URI = "postgresql://neondb_owner:npg_5wQeyoh4pxFT@ep-fragrant-dawn-at7nzvqv-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
engine = create_engine(DB_URI)

@event.listens_for(engine, 'connect')
def set_search_path(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("SET search_path TO readiness_db;")
    cursor.close()

print("Starting Database Import...")

# --- IMPORT 1: LRS (PO Transactions) ---
f1_csv = 'PO_PRICE_HIGHER_CONTRACT.csv'
if os.path.exists(f1_csv):
    print(f"Reading {f1_csv}...")
    df1 = pd.read_csv(f1_csv)
    df1['Date of Creation'] = pd.to_datetime(df1['Date of Creation'], dayfirst=True, errors='coerce')
    df1.to_sql('po_records', engine, if_exists='replace', index=False)
    print("✅ LRS Data (po_records) imported successfully.")
else:
    print(f"⚠️ Could not find {f1_csv}.")

# --- IMPORT 2: PRS (Audit Plan) ---
f2_xlsx = 'Audit Plan.xlsx'
f2_csv = 'Audit Plan.xlsx - Sheet1.csv'
if os.path.exists(f2_xlsx):
    print(f"Reading {f2_xlsx}...")
    df2 = pd.read_excel(f2_xlsx)
    df2.to_sql('audit_plan', engine, if_exists='replace', index=False)
    print("✅ PRS Data (audit_plan) imported successfully.")
elif os.path.exists(f2_csv):
    print(f"Reading {f2_csv}...")
    df2 = pd.read_csv(f2_csv)
    df2.to_sql('audit_plan', engine, if_exists='replace', index=False)
    print("✅ PRS Data (audit_plan) imported successfully.")
else:
    print("⚠️ Could not find Audit Plan file.")

# --- IMPORT 3: PRS (RCM Config) ---
f3_xlsx = 'CompleteRcm_Manufacturing v1.xlsx'
f3_csv = 'CompleteRcm_Manufacturing v1.xlsx - RCM_Manufacturing.csv'
if os.path.exists(f3_xlsx):
    print(f"Reading {f3_xlsx}...")
    df3 = pd.read_excel(f3_xlsx)
    df3.to_sql('rcm_config', engine, if_exists='replace', index=False)
    print("✅ RCM Data (rcm_config) imported successfully.")
elif os.path.exists(f3_csv):
    print(f"Reading {f3_csv}...")
    df3 = pd.read_csv(f3_csv)
    df3.to_sql('rcm_config', engine, if_exists='replace', index=False)
    print("✅ RCM Data (rcm_config) imported successfully.")
else:
    print("⚠️ Could not find RCM Manufacturing file.")

print("\n🎉 Database setup complete! You can now start app.py")