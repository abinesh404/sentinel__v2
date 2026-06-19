from flask import Flask, jsonify, request, Blueprint
from flask_cors import CORS
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, event
import os
import random
import urllib.parse

app = Flask(__name__)
CORS(app) 
arm = Blueprint('arm', __name__, url_prefix='/arm')

# --- DATABASE CONNECTION ---
DB_URI = "postgresql://neondb_owner:npg_5wQeyoh4pxFT@ep-fragrant-dawn-at7nzvqv-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
engine = create_engine(DB_URI)

@event.listens_for(engine, 'connect')
def set_search_path(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("SET search_path TO readiness_db;")
    cursor.close()

def load_table(table_name):
    try:
        query = f'SELECT * FROM {table_name}'
        df = pd.read_sql(query, engine)
        return df.replace([np.nan, np.inf, -np.inf], None)
    except Exception as e:
        print(f"Error loading {table_name}: {e}")
        return pd.DataFrame()

def clean_code(val):
    if pd.isna(val): return "Unknown"
    try:
        return str(int(float(val)))
    except ValueError:
        return str(val).strip()

df_lrs = load_table('po_records')
df_prs = load_table('audit_plan')
df_rcm = load_table('rcm_config')

# LRS Prep
all_lrs_plants = {}
if not df_lrs.empty:
    df_lrs['Date of Creation'] = pd.to_datetime(df_lrs['Date of Creation'], dayfirst=True, errors='coerce')
    df_lrs['YearMonth'] = df_lrs['Date of Creation'].dt.to_period('M').astype(str)
    df_lrs['Plant Code'] = df_lrs['Plant Code'].apply(clean_code)
    pdf = df_lrs[['Plant Code', 'Plant Description']].drop_duplicates()
    all_lrs_plants = {str(row['Plant Code']): str(row['Plant Description']) for _, row in pdf.iterrows()}

# PRS Prep
all_prs_processes = {}
if not df_prs.empty and 'title' in df_prs.columns:
    titles = df_prs['title'].dropna().unique()
    for t in titles:
        clean_title = str(t).strip()
        all_prs_processes[clean_title] = clean_title

# --- HARDCODED RAW DATA FOR PRS (Jul 2025 - Jun 2026) ---
HARDCODED_MONTHS = [
    "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12",
    "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"
]

RAW_DATA = {
   "Cyber Security": [95, 80, 97, 55, 64, 63, 61, 64, 74, 79, 57, 91],
    "Inventory Management": [65, 96, 95, 74, 85, 86, 89, 90, 93, 83, 76, 89],
    "Order to Cash": [75, 80, 85, 87, 89, 77, 84, 65, 83, 89, 75, 80],
    "Procure to Pay": [92, 85, 89, 82, 85, 83, 87, 84, 89, 76, 80, 89],
    "Quality Management": [68, 70, 63, 79, 85, 86, 89, 80, 85, 86, 89, 90],
    "Scrap Management": [65, 96, 95, 74, 89, 90, 93, 97, 95, 83, 76, 93],
    "Taxation": [79, 68, 77, 68, 70, 60, 65, 70, 57, 60, 78, 77]
}

def get_normalized_score(process, month_str):
    try: month_idx = HARDCODED_MONTHS.index(month_str)
    except ValueError: month_idx = 0 
        
    process_key = None
    for key in RAW_DATA.keys():
        if key.lower() == str(process).lower():
            process_key = key
            break
            
    if not process_key: return 75 
        
    raw_val = RAW_DATA[process_key][month_idx]
    max_val = max(RAW_DATA[process_key])
    
    if max_val > 100: scaled = (raw_val / max_val) * 94
    elif max_val < 5: scaled = (raw_val / max_val) * 94
    else: scaled = raw_val
        
    return min(int(round(scaled)), 94)

def get_status(score):
    if score >= 80: return 'High'
    elif score >= 70: return 'Medium'
    return 'Low'

def calc_metrics(gdf, entity_code, month_str, mode):
    seed_val = sum(ord(c) for c in str(entity_code)) + sum(ord(c) for c in str(month_str))
    random.seed(seed_val)
    ct_details, rcm_details = [], []
    
    # ----------------------------------------
    # PRS LOGIC (Mapped to Hardcoded Target)
    # ----------------------------------------
    if mode == 'PRS':
        final_score = get_normalized_score(entity_code, month_str)
        ct_pct = min(final_score + 2, 95)
        rcm_pct = max(final_score - 2, 0)
        sla = min(final_score + 5, 95)
        resp = final_score
        
        # Exact record counts based on %
        rcm_fail_count = int(round(100 - rcm_pct))
        ct_fail_count = int(round(100 - ct_pct))

        rcm_subset = df_rcm[df_rcm['Process'].astype(str).str.strip().str.lower() == str(entity_code).strip().lower()] if not df_rcm.empty else pd.DataFrame()
        if rcm_subset.empty: rcm_subset = df_rcm 
        
        ct_failed_rows = gdf.sample(n=ct_fail_count, replace=True, random_state=seed_val) if ct_fail_count > 0 and not gdf.empty else pd.DataFrame()
        rcm_failed_rows = rcm_subset.sample(n=rcm_fail_count, replace=True, random_state=seed_val+1) if rcm_fail_count > 0 and not rcm_subset.empty else pd.DataFrame()
        
        for _, row in ct_failed_rows.iterrows():
            ct_details.append({
                "record_id": str(row.get('id', 'N/A')),
                "name": str(row.get('control_description', 'Unknown Description')),
                "reason": str(row.get('Risk description', 'Control Gap'))
            })
            
        for _, row in rcm_failed_rows.iterrows():
            risk_desc = row.get(' Risk Description', row.get('Risk Description', 'Unknown Risk'))
            rcm_details.append({
                "record_id": str(row.get('Control Ref No', 'N/A')),
                "name": str(row.get('Control Activity / Description', 'Unknown Activity')),
                "reason": str(risk_desc)
            })

    # ----------------------------------------
    # LRS LOGIC (Exact Math & No Pending)
    # ----------------------------------------
    else: 
        # Generate stable baseline score
        tier = sum(ord(c) for c in str(entity_code)) % 3 
        if tier == 0: 
            ct_pct, rcm_pct = int(round(random.uniform(85, 95))), int(round(random.uniform(90, 98)))
        elif tier == 1: 
            ct_pct, rcm_pct = int(round(random.uniform(70, 78))), int(round(random.uniform(70, 80)))
        else: 
            ct_pct, rcm_pct = int(round(random.uniform(50, 68))), int(round(random.uniform(50, 65)))

        sla = int(round(random.uniform(92, 98)))
        resp = int(round(random.uniform(90, 96)))
        final_score = int(round((ct_pct * 0.4) + (rcm_pct * 0.2) + (sla * 0.15) + (100 * 0.15) + (resp * 0.1)))
        
        # MATH EXACT: 100 - score = failed count
        ct_fail_count = int(round(100 - ct_pct))
        rcm_fail_count = int(round(100 - rcm_pct))
        
        # Sample exact number of failures from the global PO dataset
        ct_failed_rows = df_lrs.sample(n=ct_fail_count, replace=True, random_state=seed_val) if ct_fail_count > 0 and not df_lrs.empty else pd.DataFrame()
        rcm_failed_rows = df_lrs.sample(n=rcm_fail_count, replace=True, random_state=seed_val+1) if rcm_fail_count > 0 and not df_lrs.empty else pd.DataFrame()
        
        for _, row in ct_failed_rows.iterrows():
            ct_details.append({
                "record_id": str(row.get('PO No', 'N/A')),
                "name": str(row.get('Material Description', 'Unknown Material')),
                "reason": f"Price Diff: {row.get('PriceDiff', 0)} INR vs Contract"
            })
        for _, row in rcm_failed_rows.iterrows():
            doc_status = row.get('DOCUMENTSTATUS', row.get('Document Status', 'Pending'))
            rcm_details.append({
                "record_id": str(row.get('PO No', 'N/A')),
                "name": str(row.get('Material Description', 'Unknown Material')),
                "reason": f"Approval Status is '{doc_status}'"
            })

    obs = 1.2
    return {
        'score': final_score, 'status': get_status(final_score), 'control_test': ct_pct,
        'rcm_completeness': rcm_pct, 'sla_adherence': sla, 'user_responsiveness': resp,
        'obs_severity': obs, 'ct_details': ct_details, 'rcm_details': rcm_details
    }

@arm.route('/months')
def get_months():
    mode = request.args.get('mode', 'PRS')
    if mode == 'PRS':
        return jsonify({'months': HARDCODED_MONTHS})
    
    if df_lrs.empty or 'YearMonth' not in df_lrs.columns: return jsonify({'months': []})
    months = sorted(df_lrs['YearMonth'].dropna().unique().tolist())
    months = [m for m in months if m and m != 'NaT']
    return jsonify({'months': months})

@arm.route('/plants')
def get_plants():
    mode = request.args.get('mode', 'PRS')
    if mode == 'LRS':
        plants = [{'plant': k, 'description': v} for k, v in all_lrs_plants.items()]
    else:
        plants = [{'plant': k, 'description': v} for k, v in all_prs_processes.items()]
    return jsonify({'plants': sorted(plants, key=lambda x: x['plant'])})

@arm.route('/readiness')
def get_readiness():
    month = request.args.get('month')
    mode = request.args.get('mode', 'PRS')
    selected_plants = request.args.getlist('plants')
    
    result_plants = []
    summary = {'High': 0, 'Medium': 0, 'Low': 0, 'Pending': 0}
    
    if mode == 'PRS':
        if not month or month not in HARDCODED_MONTHS: month = HARDCODED_MONTHS[-1]
        month_idx = HARDCODED_MONTHS.index(month)
        hist_months = HARDCODED_MONTHS[:month_idx+1][-3:]
        
        for p_name in all_prs_processes.keys():
            if selected_plants and p_name not in selected_plants: continue
            
            gdf = df_prs[df_prs['title'].astype(str).str.strip().str.lower() == str(p_name).lower()]
            metrics = calc_metrics(gdf, p_name, month, mode)
            
            if metrics:
                status = metrics['status']
                summary[status] += 1
                
                trend = []
                for tm in hist_months:
                    tm_metrics = calc_metrics(gdf, p_name, tm, mode)
                    if tm_metrics: trend.append({'month': tm, 'score': tm_metrics['score']})
                
                plant_data = {'plant': p_name, 'description': p_name, 'trend': trend}
                plant_data.update(metrics)
                result_plants.append(plant_data)

    else: # LRS LOGIC 
        all_months = sorted(df_lrs['YearMonth'].dropna().unique().tolist()) if not df_lrs.empty else []
        all_months = [m for m in all_months if m and m != 'NaT']
        
        if not month or month not in all_months: 
            month = all_months[-1] if all_months else None
            
        month_idx = all_months.index(month) if month in all_months else 0
        hist_months = all_months[:month_idx+1][-3:] if all_months else [month]

        for p_code, p_desc in all_lrs_plants.items():
            if selected_plants and p_code not in selected_plants: continue
            
            # Note: We send an empty DataFrame so it relies on the df_lrs sampling logic
            metrics = calc_metrics(pd.DataFrame(), p_code, month, mode)
            if metrics:
                status = metrics['status']
                summary[status] += 1
                
                trend = []
                for tm in hist_months:
                    tm_metrics = calc_metrics(pd.DataFrame(), p_code, tm, mode)
                    if tm_metrics: trend.append({'month': tm, 'score': tm_metrics['score']})
                
                plant_data = {'plant': p_code, 'description': p_desc, 'trend': trend}
                plant_data.update(metrics)
                result_plants.append(plant_data)

    order = {'High': 1, 'Medium': 2, 'Low': 3, 'Pending': 4}
    result_plants.sort(key=lambda x: (order.get(x['status'], 5), x['plant']))

    insights = {
        'top_performer': {'name': 'N/A', 'score': '-'},
        'needs_attention': {'name': 'N/A', 'score': '-'},
        'most_improved': {'name': 'N/A', 'change': '-'},
        'most_declined': {'name': 'N/A', 'change': '-'}
    }
    valid_plants = [p for p in result_plants if p['score'] is not None]
    if valid_plants:
        vp_score = sorted(valid_plants, key=lambda x: x['score'])
        insights['needs_attention'] = {'name': vp_score[0]['description'], 'score': vp_score[0]['score']}
        insights['top_performer'] = {'name': vp_score[-1]['description'], 'score': vp_score[-1]['score']}
        for p in valid_plants:
            p['growth'] = int(round(p['trend'][-1]['score'] - p['trend'][0]['score'])) if len(p['trend']) >= 2 else 0
        vp_growth = sorted(valid_plants, key=lambda x: x.get('growth', 0))
        insights['most_declined'] = {'name': vp_growth[0]['description'], 'change': vp_growth[0]['growth']}
        insights['most_improved'] = {'name': vp_growth[-1]['description'], 'change': vp_growth[-1]['growth']}
    
    return jsonify({'summary': summary, 'plants': result_plants, 'insights': insights})

@arm.route('/plant/<path:plant_code>')
def get_plant_detail(plant_code):
    month = request.args.get('month')
    mode = request.args.get('mode', 'PRS')
    pc_clean = urllib.parse.unquote(plant_code).strip()
    
    if mode == 'PRS':
        all_months = HARDCODED_MONTHS
        if not month or month not in all_months: month = all_months[-1]
        
        desc = pc_clean
        pdata = df_prs[df_prs['title'].astype(str).str.strip().str.lower() == pc_clean.lower()]
        
        metrics = calc_metrics(pdata, pc_clean, month, mode)
        
        trend = []
        for tm in all_months:
            ts = calc_metrics(pdata, pc_clean, tm, mode)
            trend.append({'month': tm, 'score': ts['score']})
            
        prev_metrics = {}
        month_idx = all_months.index(month)
        if month_idx > 0:
            prev_m = all_months[month_idx - 1]
            pm = calc_metrics(pdata, pc_clean, prev_m, mode)
            if pm: prev_metrics = pm

        return jsonify({'description': desc, 'metrics': metrics, 'prev_metrics': prev_metrics, 'trend': trend})

    else: # LRS Logic
        all_months = sorted(df_lrs['YearMonth'].dropna().unique().tolist()) if not df_lrs.empty else [month]
        all_months = [m for m in all_months if m and m != 'NaT']
        if not month and all_months: month = all_months[-1]
            
        desc = all_lrs_plants.get(pc_clean, "Unknown Location")
            
        metrics = calc_metrics(pd.DataFrame(), pc_clean, month, mode)
        
        trend = []
        for tm in all_months:
            ts = calc_metrics(pd.DataFrame(), pc_clean, tm, mode)
            if ts: trend.append({'month': tm, 'score': ts['score']})
                
        prev_metrics = {}
        if month in all_months:
            idx = all_months.index(month)
            if idx > 0:
                prev_m = all_months[idx - 1]
                pm = calc_metrics(pd.DataFrame(), pc_clean, prev_m, mode)
                if pm: prev_metrics = pm

        return jsonify({'description': desc, 'metrics': metrics, 'prev_metrics': prev_metrics, 'trend': trend})

app.register_blueprint(arm)

if __name__ == '__main__':
    print("Starting AjaLabs ARM Backend on http://127.0.0.1:4001")
    app.run(port=4001, debug=True)