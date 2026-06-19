import os
from flask import Blueprint, request
from utils.safe_json_response import safe_jsonify as jsonify
from services.data_context_engine import data_context_engine
from services.workflow_orchestrator import orchestrator

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/api/status", methods=["GET"])
def status():
    tenant_id = request.args.get("tenant_id", "CJSJ")
    df = data_context_engine.get_dataframe(tenant_id)
    
    if df is None:
        return jsonify({"status": "empty", "message": "No file uploaded yet."})
        
    kpis, _ = data_context_engine.get_metrics(tenant_id)
    filename = data_context_engine._memory.get(tenant_id, {}).get("filename", "")
    columns = data_context_engine._memory.get(tenant_id, {}).get("columns", [])
    
    return jsonify({
        "status":   "ready",
        "filename": filename,
        "rows":     len(df),
        "columns":  columns,
        "kpis":     kpis,
    })


@dashboard_bp.route("/api/data", methods=["GET"])
def get_data():
    """Return full current dataset to the frontend on page load."""
    tenant_id = request.args.get("tenant_id", "CJSJ")
    check_and_load_tenant_files(tenant_id)
    tenant_mem = data_context_engine._memory.get(tenant_id, {})
    
    if "auditors" not in tenant_mem:
        default_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "AI Suggestions data", "Master data for Auditors.xlsx")
        try:
            auditors = parse_auditor_master(default_path)
            if auditors:
                data_context_engine._init_tenant(tenant_id)
                data_context_engine._memory[tenant_id]["auditors"] = auditors
        except Exception as e:
            print("Failed to parse default auditors on get_data:", e)
    
    if tenant_mem.get("df") is None:
        return jsonify({
            "status": "empty",
            "auditors": tenant_mem.get("auditors", []),
            "auditorFilename": tenant_mem.get("auditor_filename", "Master data for Auditors.xlsx")
        })
        
    return jsonify({
        "status":        "ready",
        "filename":      tenant_mem.get("filename", ""),
        "totalRows":     len(tenant_mem.get("rows", [])),
        "columns":       tenant_mem.get("columns", []),
        "columnMap":     tenant_mem.get("column_map", {}),
        "rows":          tenant_mem.get("rows", []),
        "chartData":     tenant_mem.get("chart_data", {}),
        "auditPlan":     tenant_mem.get("audit_plan", []),
        "aiSuggestions": tenant_mem.get("ai_suggestions", []),
        "top5Risks":     tenant_mem.get("top_5_risks", []),
        "classifiedTabs": tenant_mem.get("classified_tabs", {}),
        "kpis":          tenant_mem.get("kpis", {}),
        "validationWarnings": tenant_mem.get("validation_warnings", []),
        "dataQuality": tenant_mem.get("data_quality", {}),
        "auditors":      tenant_mem.get("auditors", []),
        "auditorFilename": tenant_mem.get("auditor_filename", "Master data for Auditors.xlsx")
    })


@dashboard_bp.route("/api/top-risks", methods=["GET"])
def get_top_risks():
    tenant_id = request.args.get("tenant_id", "CJSJ")
    process_name = request.args.get("process")
    check_and_load_tenant_files(tenant_id)
    df = data_context_engine.get_dataframe(tenant_id)
    if df is None or df.empty:
        return jsonify({"status": "empty", "message": "No file uploaded yet."})
        
    from audit.top_risk_engine import get_top_5_risks, generate_process_recommendations
    
    # Recalculate or retrieve top 5 risks to make sure it matches current mappings/classifications
    top_5_risks = get_top_5_risks(df)
    
    if process_name:
        recs = generate_process_recommendations(df, process_name)
        from audit.top_risk_engine import get_process_controls
        proc_df = get_process_controls(df, process_name)
        
        # Clean data for JSON serialization
        import math
        records = proc_df.to_dict(orient="records")
        def clean_row(row):
            return {k: ("" if (isinstance(v, float) and math.isnan(v)) else str(v).strip()) for k, v in row.items()}
        rows = [clean_row(r) for r in records]
        
        return jsonify({
            "process": process_name,
            "recommendations": recs["recommendations"],
            "automationOpportunities": recs["automation_opportunities"],
            "expectedAuditImpact": recs["expected_audit_impact"],
            "controls": rows
        })
        
    return jsonify({
        "status": "ready",
        "top5Risks": top_5_risks
    })

@dashboard_bp.route("/api/strategic-plan", methods=["GET"])
def get_strategic_plan():
    tenant_id = request.args.get("tenant_id", "CJSJ")
    check_and_load_tenant_files(tenant_id)
    df = data_context_engine.get_dataframe(tenant_id)
    
    import math
    import re
    import os
    import pandas as pd
    
    # Load reference controls & risks from ref_audit_plan table in PostgreSQL
    ref_controls = []
    ref_risks = []
    ref_df = None
    try:
        from utils.postgres_db import get_connection
        conn = get_connection()
        try:
            ref_df = pd.read_sql("SELECT * FROM sentinel_db.ref_audit_plan;", conn)
        finally:
            conn.close()

        if ref_df is not None and not ref_df.empty:
            if "control_description" in ref_df.columns:
                ref_controls = [str(x).strip().lower() for x in ref_df["control_description"].dropna().tolist()]
            if "Risk description" in ref_df.columns:
                ref_risks = [str(x).strip().lower() for x in ref_df["Risk description"].dropna().tolist()]
    except Exception as e:
        print("Error reading ref_audit_plan table:", e)

    # Do not automatically fall back to reference Excel if no user file is uploaded.
    if df is None or df.empty:
        return jsonify([])
        
    control_col = "control_description"
    if control_col not in df.columns:
        for c in df.columns:
            if "control" in c.lower() or "description" in c.lower():
                control_col = c
                break
    
    process_col = "process"
    if process_col not in df.columns:
        for c in df.columns:
            if "process" in c.lower() or "title" in c.lower():
                process_col = c
                break
                
    class_col = "control_classification"
    if class_col not in df.columns:
        for c in df.columns:
            if "class" in c.lower() or "category" in c.lower() or "type" in c.lower():
                class_col = c
                break

    if control_col not in df.columns:
        control_col = df.columns[0]
    if process_col not in df.columns:
        process_col = df.columns[0]
    if class_col not in df.columns:
        class_col = df.columns[0]

    score_col = "risk_score" if "risk_score" in df.columns else None
    
    risk_col = None
    for c in df.columns:
        if "risk" in c.lower():
            risk_col = c
            break

    # Helper function for matching keywords with word boundaries for short acronyms
    def match_keywords(proc_str, keywords):
        for kw in keywords:
            if len(kw) <= 3:
                if re.search(r'\b' + re.escape(kw) + r'\b', proc_str):
                    return True
            else:
                if kw in proc_str:
                    return True
        return False

    preferred_names = [
        "Procure to Pay",
        "Order to Cash",
        "Inventory Management",
        "Quality Management",
        "Taxation",
        "Scrap Management",
        "Cyber Security"
    ]
    
    preferred_keywords = {
        "Procure to Pay": ["procure", "p2p", "vendor", "invoice", "payment", "procurement", "purchase order", "supplier", "accounts payable", "ap", "purchasing"],
        "Order to Cash": ["order", "cash", "o2c", "customer", "sales", "billing", "revenue", "credit limit", "accounts receivable", "receivable", "ar"],
        "Inventory Management": ["inventory", "stock", "warehouse", "material movement", "reconciliation", "bom", "raw material", "production planning", "store"],
        "Quality Management": ["quality", "inspection", "compliance", "testing", "validation", "qa"],
        "Taxation": ["tax", "taxation", "gst", "vat", "levy", "duty", "excise", "fiscal"],
        "Scrap Management": ["scrap", "waste", "rejection", "disposal"],
        "Cyber Security": ["cyber", "security", "it", "information security", "firewall", "network", "access control", "privilege", "system", "itgc", "it general controls", "itgcs"]
    }

    # Group controls and accumulate scores/metadata under mapped process names
    process_groups = {}
    for pref in preferred_names:
        process_groups[pref] = {
            "process_name": pref,
            "matched_controls": [],
            "matched_scores": [],
            "matched_risks": [],
            "unmatched_controls": [],
            "unmatched_scores": [],
            "unmatched_risks": []
        }
    
    for _, row in df.iterrows():
        proc_raw = str(row.get(process_col, "")).strip()
        proc_val = proc_raw.lower()
        desc_val = str(row.get(control_col, "")).strip()
        
        if not desc_val or desc_val.lower() == "nan":
            continue
            
        # Determine which process name to map to
        mapped_name = None
        for pref in preferred_names:
            if match_keywords(proc_val, preferred_keywords[pref]):
                mapped_name = pref
                break
        
        if not mapped_name:
            continue
            
        # Match control description strictly against reference Audit Plan.xlsx controls using alphanumeric normalization
        import re
        def clean_text_compare(t):
            return re.sub(r'[^a-z0-9]', '', str(t).lower())
            
        desc_val_cleaned = clean_text_compare(desc_val)
        matched_control_desc = None
        if ref_controls and desc_val_cleaned:
            for idx, ref_c in enumerate(ref_controls):
                ref_c_cleaned = clean_text_compare(ref_c)
                if ref_c_cleaned == desc_val_cleaned or ref_c_cleaned in desc_val_cleaned or desc_val_cleaned in ref_c_cleaned:
                    matched_control_desc = str(ref_df["control_description"].dropna().tolist()[idx]).strip()
                    break
        
        # Risk score mapping
        score_val = 70
        if score_col:
            try:
                score_val = float(row.get(score_col, 70))
                if math.isnan(score_val):
                    score_val = 70
            except Exception:
                pass
                
        # Risk description mapping
        risk_val = ""
        if risk_col and risk_col in row:
            risk_val = str(row.get(risk_col, "")).strip()
            if risk_val.lower() == "nan":
                risk_val = ""

        risk_num = str(row.get("risk_number", "")).strip()
        if risk_num.lower() == "nan":
            risk_num = ""

        if matched_control_desc:
            if not any(x["control_description"] == matched_control_desc for x in process_groups[mapped_name]["matched_controls"]):
                process_groups[mapped_name]["matched_controls"].append({
                    "control_description": matched_control_desc,
                    "risk_description": risk_val or "Operational Controls & Compliance",
                    "risk_number": risk_num
                })
                process_groups[mapped_name]["matched_scores"].append(score_val)
        else:
            if not any(x["control_description"] == desc_val for x in process_groups[mapped_name]["unmatched_controls"]):
                process_groups[mapped_name]["unmatched_controls"].append({
                    "control_description": desc_val,
                    "risk_description": risk_val or "Operational Controls & Compliance",
                    "risk_number": risk_num
                })
                process_groups[mapped_name]["unmatched_scores"].append(score_val)

    # Construct the processes in the exact order requested by preferred_names
    selected_processes = []
    for pref in preferred_names:
        if pref in process_groups:
            selected_processes.append(process_groups[pref])

    # Build response list with scores, hours, auditors, and allocated controls
    strategic_plan_response = []
    
    default_scores = {
        "Procure to Pay": 92,
        "Order to Cash": 72,
        "Scrap Management": 72,
        "Inventory Management": 92,
        "Quality Management": 72,
        "Taxation": 72,
        "Cyber Security": 92
    }
    
    # Fetch dynamic scores from ARM backend
    arm_scores = {}
    try:
        import urllib.request
        import json
        req_months = urllib.request.Request(
            "http://127.0.0.1:4001/arm/months",
            headers={"User-Agent": "Sentinel-Agent"}
        )
        with urllib.request.urlopen(req_months, timeout=2) as response:
            months_data = json.loads(response.read().decode("utf-8"))
            months_list = months_data.get("months", [])
        
        latest_month = months_list[-1] if months_list else "2024-09"
        
        url_readiness = f"http://127.0.0.1:4001/arm/readiness?mode=PRS&month={latest_month}"
        req_readiness = urllib.request.Request(
            url_readiness,
            headers={"User-Agent": "Sentinel-Agent"}
        )
        with urllib.request.urlopen(req_readiness, timeout=2) as response:
            readiness_data = json.loads(response.read().decode("utf-8"))
            plants = readiness_data.get("plants", [])
            for p in plants:
                desc = p.get("description")
                score = p.get("score")
                if desc and score is not None:
                    arm_scores[desc] = score
    except Exception as e:
        print("[Sentinel] Fallback to hardcoded scores, failed to fetch from ARM backend:", e)
    
    default_risk_areas = {
        "Procure to Pay": "Purchase Orders deliberately split below approval thresholds to circumvent Delegation of Authority, enabling unauthorised procurement.",
        "Order to Cash": "Goods sold at zero or nominal value without proper authorisation lead to revenue loss and potential collusion with customers.",
        "Inventory Management": "Procurement occurs for materials where existing inventory already exceeds reorder level, leading to excess stock and high carrying costs.",
        "Quality Management": "Expired, quality-rejected or quality-hold materials issued for production or dispatched to market, leading to product safety failures and regulatory non-compliance.",
        "Taxation": "Ineligible ITC may be claimed leading to regulatory exposure.",
        "Scrap Management": "Scrap Sales",
        "Cyber Security": "Inadequate database security (weak passwords, excessive file permissions, insecure configuration settings) exposes the SAP database to unauthorised access and data manipulation."
    }
    
    for p in selected_processes:
        name = p["process_name"]
        
        # Decide whether to show matched controls or unmatched controls (if no matches are found)
        if p["matched_controls"]:
            controls = p["matched_controls"]
        else:
            controls = p["unmatched_controls"]
            
        # Risk score matches Excel plan defaults strictly
        risk_score = arm_scores.get(name) if name in arm_scores else default_scores.get(name, 85)
        
        total_controls = len(controls)
        man_hours = total_controls * 16
        auditors = max(1, math.ceil(total_controls / 3)) if total_controls > 0 else 0
        
        risk_area = default_risk_areas.get(name, "Operational Controls & Compliance")
        
        # Prioritize using the actual risk description from the RCM
        clean_risks = [r["risk_description"] for r in controls if r.get("risk_description") and r.get("risk_description").lower() != "nan" and r.get("risk_description").strip() != ""]
        if clean_risks:
            risk_area = clean_risks[0]
            
        strategic_plan_response.append({
            "process_name": name,
            "risk_area": risk_area,
            "risk_score": risk_score,
            "man_hours": man_hours,
            "auditors": auditors,
            "controls": controls
        })
        
    return jsonify(strategic_plan_response)


@dashboard_bp.route("/api/auditors/add", methods=["POST"])
def add_auditor():
    body = request.get_json(silent=True) or {}
    tenant_id = body.get("tenant_id", "CJSJ")
    name = body.get("name")
    
    if not name:
        return jsonify({"error": "Missing name"}), 400
        
    data_context_engine._init_tenant(tenant_id)
    tenant_mem = data_context_engine._memory.get(tenant_id, {})
    auditors = tenant_mem.get("auditors", [])
    
    next_id = max([a["id"] for a in auditors] + [0]) + 1
    new_auditor = {
        "id": next_id,
        "name": name,
        "role": "Auditor",
        "department": "Internal Audit",
        "availability": "Available",
        "experience": "3 Years"
    }
    auditors.append(new_auditor)
    data_context_engine._memory[tenant_id]["auditors"] = auditors
    
    if "status_tracker_rows" in data_context_engine._memory[tenant_id]:
        del data_context_engine._memory[tenant_id]["status_tracker_rows"]
        
    return jsonify({
        "success": True,
        "auditor": new_auditor
    })



@dashboard_bp.route("/api/analyze-control", methods=["POST"])
def analyze_control_endpoint():
    body = request.get_json(silent=True) or {}
    control_data = body.get("control_data")
    tenant_id = body.get("tenant_id", "CJSJ")
    
    if not control_data:
        return jsonify({"error": "Missing control_data"}), 400
        
    response = orchestrator.execute_control_analysis_pipeline(tenant_id, control_data)
    
    if response.status == "error":
        return jsonify({"error": "Analysis failed", "details": response.errors}), 500
        
    return jsonify({
        "success": True,
        "insight": response.data
    })


@dashboard_bp.route("/api/analyze-dataset", methods=["POST"])
def analyze_dataset_endpoint():
    tenant_id = request.args.get("tenant_id") or request.form.get("tenant_id") or "CJSJ"
    
    response = orchestrator.execute_dataset_analysis_pipeline(tenant_id)
    
    if response.status == "error":
        return jsonify({"error": "Analysis failed", "details": response.errors}), 400
        
    return jsonify({
        "success": True,
        "insight": response.data
    })


# ── AUDIT STATUS TRACKER BACKEND IMPLEMENTATION ──

def parse_auditor_master(file_path):
    import pandas as pd
    
    # Try dynamic path based on workspace location first, then fallback to file_path
    default_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "AI Suggestions data", "Master data for Auditors.xlsx")
    
    # Read from database if requesting default/deleted local file, otherwise read the provided file
    if file_path == default_path or not os.path.exists(file_path):
        try:
            from utils.postgres_db import get_connection
            conn = get_connection()
            try:
                df = pd.read_sql("SELECT * FROM sentinel_db.ref_auditors;", conn)
            finally:
                conn.close()
        except Exception as e:
            print("Error reading ref_auditors table:", e)
            df = pd.DataFrame()
    else:
        df = pd.read_excel(file_path)
    
    # Always take the 2nd column (index 1) for the auditor name
    if len(df.columns) > 1:
        name_col = df.columns[1]
    else:
        name_col = df.columns[0]
            
    # 2. Identify potential metadata columns
    role_col = next((c for c in df.columns if "role" in c.lower() or "title" in c.lower()), None)
    dept_col = next((c for c in df.columns if "dept" in c.lower() or "department" in c.lower()), None)
    avail_col = next((c for c in df.columns if "avail" in c.lower() or "status" in c.lower()), None)
    exp_col = next((c for c in df.columns if "exp" in c.lower() or "year" in c.lower() or "experience" in c.lower()), None)

    roles = ["Senior Auditor", "Audit Manager", "Lead Auditor", "IT Auditor", "Financial Analyst"]
    departments = ["Internal Audit", "Finance", "Information Security", "Operations", "Compliance"]
    availabilities = ["Available", "Partial Availability", "Allocated"]
    
    records = df.to_dict(orient="records")
    auditors = []
    valid_idx = 0
    for row in records:
        name_val = str(row.get(name_col, "")).strip()
        if not name_val or name_val.lower() == "nan" or name_val.lower().startswith("master data"):
            continue
            
        role_val = str(row.get(role_col, "")).strip() if role_col else roles[valid_idx % len(roles)]
        if not role_val or role_val.lower() == "nan":
            role_val = roles[valid_idx % len(roles)]
            
        dept_val = str(row.get(dept_col, "")).strip() if dept_col else departments[valid_idx % len(departments)]
        if not dept_val or dept_val.lower() == "nan":
            dept_val = departments[valid_idx % len(departments)]
            
        avail_val = str(row.get(avail_col, "")).strip() if avail_col else availabilities[valid_idx % len(availabilities)]
        if not avail_val or avail_val.lower() == "nan":
            avail_val = availabilities[valid_idx % len(availabilities)]
            
        exp_val = str(row.get(exp_col, "")).strip() if exp_col else f"{(valid_idx % 8) + 3} Years"
        if not exp_val or exp_val.lower() == "nan":
            exp_val = f"{(valid_idx % 8) + 3} Years"
            
        auditors.append({
            "id": valid_idx + 1,
            "name": name_val,
            "role": role_val,
            "department": dept_val,
            "availability": avail_val,
            "experience": exp_val
        })
        valid_idx += 1
        
    return auditors


def rebuild_context_from_db(tenant_id: str) -> bool:
    import psycopg2
    import pandas as pd
    import math
    from utils.postgres_db import DB_URL
    from services.data_context_engine import data_context_engine
    
    try:
        conn = psycopg2.connect(DB_URL)
        with conn.cursor() as cur:
            cur.execute('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = \'public\' AND table_name = \'input_rcm\'')
            if not cur.fetchone()[0]:
                conn.close()
                return False
                
            cur.execute('SELECT COUNT(*) FROM input_rcm WHERE tenant_id = %s', (tenant_id,))
            count = cur.fetchone()[0]
            if count == 0:
                conn.close()
                return False
            
            # Load from DB
            query = 'SELECT "Process", "Risk number", "Control Classification", "Risk Description", "Risk Classification", ' \
                    '"Control Ref No", "Control Activity / Description", "Control Nature", "Control Type", "Occurance", ' \
                    '"Control Activity Frequency", "Control Performed by", "Design Assessment Result", "Gaps Noted (if any)", ' \
                    '"Attribute", "Data Request", "Remarks", "Others", "file name", "index" FROM input_rcm WHERE tenant_id = %s'
            cur.execute(query, (tenant_id,))
            rows_db = cur.fetchall()
            
            columns = [
                "Process", "Risk number", "Control Classification", "Risk Description", "Risk Classification",
                "Control Ref No", "Control Activity / Description", "Control Nature", "Control Type", "Occurance",
                "Control Activity Frequency", "Control Performed by", "Design Assessment Result", "Gaps Noted (if any)",
                "Attribute", "Data Request", "Remarks", "Others", "file name", "index"
            ]
            
            df = pd.DataFrame(rows_db, columns=columns)
            filename = df.iloc[0].get("file name", "RCM.xlsx") if not df.empty else "RCM.xlsx"
            
            # Standard columns mapping
            df = df.rename(columns={
                "Process": "process",
                "Control Activity / Description": "control_description",
                "Risk Description": "risk_description",
                "Risk number": "risk_number",
                "file name": "file_name"
            })
            
            # Run classification & risk detection
            from audit.control_classifier import classify_controls
            from audit.risk_engine import detect_risks
            df = classify_controls(df)
            df = detect_risks(df)
            
            standard_col_map = {
                "process": "process",
                "risk_number": "risk_number",
                "risk": "risk_description",
                "risk_class": "risk_classification",
                "risk_classification": "risk_classification",
                "control_classification": "control_classification",
                "classification": "control_category",
                "control": "control_description",
                "control_ref": "control_ref",
                "control_type": "control_type",
                "control_nature": "control_nature",
                "occurrence": "occurrence",
                "frequency": "frequency",
                "performed_by": "owner",
                "assessment": "assessment",
                "gaps": "gaps",
                "remarks": "remarks",
                "others": "Others"
            }
            
            # Generate analytics
            from analytics.analytics_service import generate_analytics
            analytics = generate_analytics(df, standard_col_map)
            kpis = analytics["kpis"]
            charts = analytics["charts"]
            
            # Semantic classification
            import os
            from services.insights_classifier import load_insights_library, classify_control as _classify_control
            _insights_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)), "source_data", "insights.csv"
            )
            _insights_library = load_insights_library(os.path.abspath(_insights_path))
            
            classified_tabs = {
                "complibear_integrated": [],
                "ready_for_deployment": [],
                "low_hanging_fruits": [],
                "ai_suggestions": []
            }
            
            from services.workflow_orchestrator import get_classified_row_data
            for idx, row in df.iterrows():
                row_data = get_classified_row_data(row, idx, standard_col_map)
                ctrl_text = str(row.get(standard_col_map.get("control", ""), "") or "")
                risk_text = str(row.get(standard_col_map.get("risk", ""), "") or "")
                ctrl_type = str(row.get(standard_col_map.get("control_type", ""), "") or "")
                freq_text = str(row.get(standard_col_map.get("frequency", ""), "") or "")
                
                category = _classify_control(
                    ctrl_text=ctrl_text,
                    risk_text=risk_text,
                    insights_library=_insights_library,
                    control_type=ctrl_type,
                    frequency=freq_text,
                )
                row_data["ai_category"] = category
                
                if category == "complibear_integrated":
                    classified_tabs["complibear_integrated"].append(row_data)
                elif category == "low_hanging_fruit":
                    classified_tabs["low_hanging_fruits"].append(row_data)
                else:
                    classified_tabs["ready_for_deployment"].append(row_data)
            
            from engines.automation_engine import build_ai_suggestions
            ai_suggs = build_ai_suggestions(df, standard_col_map)
            classified_tabs["ai_suggestions"] = ai_suggs
            
            from audit.audit_priority_engine import build_audit_plan
            audit_plan = build_audit_plan(df, standard_col_map)
            
            from audit.top_risk_engine import get_top_5_risks
            top_5_risks = get_top_5_risks(df, standard_col_map)
            
            rows = []
            for tab_name in ["complibear_integrated", "ready_for_deployment", "low_hanging_fruits"]:
                for row_data in classified_tabs.get(tab_name, []):
                    orig = dict(row_data["_original_row"])
                    orig["ai_category"] = row_data["ai_category"]
                    orig["risk_score"] = row_data["risk_score"]
                    orig["risk_level"] = row_data["risk_level"]
                    orig["control_nature"] = row_data["control_nature"]
                    rows.append(orig)
            
            cleaned_rows = []
            for r in rows:
                cleaned_r = {}
                for k, v in r.items():
                    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                        cleaned_r[k] = None
                    elif pd.isnull(v):
                        cleaned_r[k] = None
                    else:
                        cleaned_r[k] = v
                cleaned_rows.append(cleaned_r)
            rows = cleaned_rows
            
            # Store in Context Memory
            data_context_engine.set_dataframe(tenant_id, df, filename)
            data_context_engine.set_metrics(tenant_id, kpis, charts)
            
            data_context_engine._init_tenant(tenant_id)
            data_context_engine._memory[tenant_id]["rows"] = rows
            data_context_engine._memory[tenant_id]["columns"] = df.columns.tolist()
            data_context_engine._memory[tenant_id]["column_map"] = standard_col_map
            data_context_engine._memory[tenant_id]["audit_plan"] = audit_plan
            data_context_engine._memory[tenant_id]["ai_suggestions"] = ai_suggs
            data_context_engine._memory[tenant_id]["top_5_risks"] = top_5_risks
            data_context_engine._memory[tenant_id]["classified_tabs"] = classified_tabs
            
            from services.workflow_orchestrator import compute_distribution_metrics
            distribution_metrics = compute_distribution_metrics(classified_tabs)
            data_context_engine._memory[tenant_id]["validation_warnings"] = []
            
            data_quality = {
                "rawRows": len(df),
                "cleanRows": len(df),
                "sheetsProcessed": [filename],
                "sheetRowCounts": {filename: len(df)},
                "duplicateRecordsMerged": 0,
            }
            data_context_engine._memory[tenant_id]["data_quality"] = data_quality
            
            conn.close()
            return True
            
    except Exception as e:
        print(f"[PostgreSQL] Failed to rebuild context from DB: {e}")
        import traceback
        traceback.print_exc()
        return False

def check_and_load_tenant_files(tenant_id):
    # 1. We no longer automatically load database data at starting to use only explicitly uploaded/selected data.
    tenant_mem = data_context_engine._memory.get(tenant_id, {})

    # 2. Fallback to scanning upload folder for auditors file
    from services.tenant_manager import tenant_manager
    import glob
    
    upload_dir = tenant_manager.get_upload_dir(tenant_id)
    files = []
    for ext in ["*.xlsx", "*.xls", "*.csv"]:
        files.extend(glob.glob(os.path.join(upload_dir, ext)))
    if not files:
        return
        
    files.sort(key=os.path.getmtime, reverse=True)
    
    auditor_file = None
    for f in files:
        base = os.path.basename(f)
        if "auditor" in base.lower():
            auditor_file = f
            break
                
    if "auditors" not in tenant_mem:
        if auditor_file:
            try:
                auditors = parse_auditor_master(auditor_file)
                data_context_engine._init_tenant(tenant_id)
                data_context_engine._memory[tenant_id]["auditors"] = auditors
                data_context_engine._memory[tenant_id]["auditor_filename"] = os.path.basename(auditor_file)
            except Exception as e:
                print("Failed to auto-load tenant auditors:", e)


@dashboard_bp.route("/api/upload-auditors", methods=["POST"])
def upload_auditors():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    f = request.files["file"]
    if f.filename == "":
        return jsonify({"error": "No file selected"}), 400

    tenant_id = request.form.get("tenant_id", "CJSJ")
    from services.tenant_manager import tenant_manager
    upload_dir = tenant_manager.get_upload_dir(tenant_id)
    
    from werkzeug.utils import secure_filename
    filename = secure_filename(f.filename)
    # Ensure it indicates it's an auditor file
    if "auditor" not in filename.lower():
        filename = f"auditors_{filename}"
        
    file_path = os.path.join(upload_dir, filename)
    f.save(file_path)

    try:
        auditors = parse_auditor_master(file_path)
        data_context_engine._init_tenant(tenant_id)
        data_context_engine._memory[tenant_id]["auditors"] = auditors
        data_context_engine._memory[tenant_id]["auditor_filename"] = filename
        
        # Clear cached tracker rows so they regenerate with new auditors
        if "status_tracker_rows" in data_context_engine._memory[tenant_id]:
            del data_context_engine._memory[tenant_id]["status_tracker_rows"]
            
        return jsonify({
            "success": True,
            "filename": filename,
            "totalAuditors": len(auditors),
            "auditors": auditors
        })
    except Exception as e:
        return jsonify({"error": f"Failed to parse Auditor Master file: {str(e)}"}), 400


@dashboard_bp.route("/api/auditors", methods=["GET"])
def get_auditors():
    tenant_id = request.args.get("tenant_id", "CJSJ")
    check_and_load_tenant_files(tenant_id)
    tenant_mem = data_context_engine._memory.get(tenant_id, {})
    
    if "auditors" not in tenant_mem:
        default_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "AI Suggestions data", "Master data for Auditors.xlsx")
        try:
            auditors = parse_auditor_master(default_path)
            if auditors:
                data_context_engine._init_tenant(tenant_id)
                data_context_engine._memory[tenant_id]["auditors"] = auditors
            else:
                return jsonify([])
        except Exception as e:
            return jsonify({"error": f"Failed to parse default auditors: {str(e)}"}), 500
            
    return jsonify(data_context_engine._memory[tenant_id].get("auditors", []))


@dashboard_bp.route("/api/status-tracker", methods=["GET"])
def get_status_tracker():
    tenant_id = request.args.get("tenant_id", "CJSJ")
    check_and_load_tenant_files(tenant_id)
    tenant_mem = data_context_engine._memory.get(tenant_id, {})
    
    # Return from cache if already generated
    if "status_tracker_rows" in tenant_mem:
        return jsonify(tenant_mem["status_tracker_rows"])
        
    df = data_context_engine.get_dataframe(tenant_id)
    if df is None or df.empty:
        return jsonify([])
        
    # Get active auditors
    auditors = tenant_mem.get("auditors", [])
    if not auditors:
        default_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "AI Suggestions data", "Master data for Auditors.xlsx")
        try:
            auditors = parse_auditor_master(default_path)
            if auditors:
                data_context_engine._init_tenant(tenant_id)
                data_context_engine._memory[tenant_id]["auditors"] = auditors
        except Exception as e:
            print("Failed to load fallback auditors for status tracker:", e)
                
    # Map columns to extract details
    process_col = "process" if "process" in df.columns else df.columns[0]
    
    control_col = "control_description" if "control_description" in df.columns else None
    if not control_col:
        for col in df.columns:
            if "control" in col.lower() or "desc" in col.lower():
                control_col = col
                break
        if not control_col:
            control_col = df.columns[0]
            
    sub_col = None
    for col in df.columns:
        if "sub-process" in col.lower() or "subprocess" in col.lower() or "sub process" in col.lower():
            sub_col = col
            break
    if not sub_col:
        sub_col = "risk_description" if "risk_description" in df.columns else None
    if not sub_col:
        for col in df.columns:
            if "risk" in col.lower():
                sub_col = col
                break
        if not sub_col:
            sub_col = df.columns[0]

    records = df.to_dict(orient="records")
    tracker_rows = []
    
    for idx, row in enumerate(records):
        proc_val = str(row.get(process_col, "Unspecified Process")).strip()
        
        # Clean sub-process: If it's a long risk statement, clean it up or truncate for group header
        sub_val = str(row.get(sub_col, "Core Sub-Process")).strip()
        if len(sub_val) > 75:
            # Clean it to first sentence or truncate
            dot_idx = sub_val.find(".")
            if dot_idx != -1 and dot_idx > 10:
                sub_val = sub_val[:dot_idx]
            if len(sub_val) > 75:
                sub_val = sub_val[:72] + "..."
                
        desc_val = str(row.get(control_col, "")).strip()
        if not desc_val or desc_val.lower() == "nan":
            continue
            
        desc_len = len(desc_val)
        
        # Calculate dynamic auditors count based on description length
        if desc_len < 100:
            num_auditors = 1
            man_hours = 4
        elif desc_len < 200:
            num_auditors = 2
            man_hours = 8
        elif desc_len < 350:
            num_auditors = 3
            man_hours = 12
        else:
            num_auditors = 4
            man_hours = 16
            
        # Sequentially assign an auditor
        assigned = ""
        if auditors:
            assigned = auditors[idx % len(auditors)]["name"]
            
        tracker_rows.append({
            "id": f"track_{idx}",
            "process": proc_val,
            "sub_process": sub_val,
            "description": desc_val,
            "start_date": "",
            "end_date": "",
            "assigned_auditor": assigned,
            "num_auditors": num_auditors,
            "man_hours": man_hours,
            "status": "Not Started"
        })
        
    data_context_engine._memory[tenant_id]["status_tracker_rows"] = tracker_rows
    return jsonify(tracker_rows)


@dashboard_bp.route("/api/status-tracker/update", methods=["POST"])
def update_status_tracker():
    body = request.get_json(silent=True) or {}
    tenant_id = body.get("tenant_id", "CJSJ")
    row_id = body.get("id")
    updates = body.get("updates", {})
    
    if not row_id:
        return jsonify({"error": "Missing row id"}), 400
        
    tenant_mem = data_context_engine._memory.get(tenant_id, {})
    rows = tenant_mem.get("status_tracker_rows", [])
    
    updated = False
    for r in rows:
        if r["id"] == row_id:
            # Apply editable fields
            for key in ["status", "assigned_auditor", "start_date", "end_date", "man_hours", "num_auditors"]:
                if key in updates:
                    r[key] = updates[key]
            updated = True
            break
            
    if updated:
        data_context_engine._memory[tenant_id]["status_tracker_rows"] = rows
        return jsonify({"success": True})
        
    return jsonify({"error": "Row not found"}), 404


@dashboard_bp.route("/api/status-tracker/bulk-init", methods=["POST"])
def bulk_init_status_tracker():
    body = request.get_json(silent=True) or {}
    tenant_id = body.get("tenant_id", "CJSJ")
    rows = body.get("rows", [])
    
    data_context_engine._init_tenant(tenant_id)
    data_context_engine._memory[tenant_id]["status_tracker_rows"] = rows
    return jsonify({"success": True})


@dashboard_bp.route("/api/gap-analysis/benchmarks", methods=["GET"])
def get_gap_analysis_benchmarks():
    scope = request.args.get("scope", "global").strip().lower()
    region = request.args.get("region", "North America").strip()
    industry = request.args.get("industry", "Manufacturing").strip()
    
    # Mapping dictionary
    INDUSTRY_MAPPING = {
        "Financial Services": {
            "risk_col": "Financial services",
            "fraud_row": "Banking and financial services"
        },
        "Government": {
            "risk_col": "Public sector (government)",
            "fraud_row": "Government and public administration"
        },
        "Manufacturing": {
            "risk_col": "Manufacturing",
            "fraud_row": "Manufacturing"
        },
        "Mining/Energy": {
            "risk_col": "Mining/energy/water",
            "fraud_row": "Energy"
        },
        "Agriculture": {
            "risk_col": "Agriculture/forestry/fishing",
            "fraud_row": "Agriculture, forestry, fishing, and hunting"
        },
        "Wholesale/Retail": {
            "risk_col": "Wholesale and retail",
            "fraud_row": "Retail"
        },
        "Administrative Support": {
            "risk_col": "Administrative/support services",
            "fraud_row": "Government and public administration"
        },
        "Technology": {
            "risk_col": "Information/communication",
            "fraud_row": "Technology"
        },
        "Education": {
            "risk_col": "Education",
            "fraud_row": "Education"
        },
        "Transportation": {
            "risk_col": "Transport/storage",
            "fraud_row": "Transportation and warehousing"
        },
        "Healthcare": {
            "risk_col": "Health/social work",
            "fraud_row": "Health care"
        },
        "Construction": {
            "risk_col": "Construction",
            "fraud_row": "Construction"
        },
        "Real Estate": {
            "risk_col": "Real estate",
            "fraud_row": "Banking and financial services"
        },
        "Information/Communication": {
            "risk_col": "Information/communication",
            "fraud_row": "Technology"
        }
    }
    
    try:
        from utils.postgres_db import get_connection
        import pandas as pd
        conn = get_connection()
        try:
            df_global = pd.read_sql("SELECT * FROM sentinel_db.ref_global_risk;", conn)
            df_ind = pd.read_sql("SELECT * FROM sentinel_db.ref_industry_risk;", conn)
            df_fraud = pd.read_sql("SELECT * FROM sentinel_db.ref_industry_fraud;", conn)
        finally:
            conn.close()
        
        # 1. Left Chart: Top Risks Analysis
        left_data = []
        if scope == "global" or not scope:
            col = "Global Average"
            if col in df_global.columns:
                for idx, row in df_global.iterrows():
                    risk_area = str(row.get("Risk Area", "")).strip()
                    val = row.get(col)
                    if pd.notnull(val) and risk_area:
                        left_data.append({"name": risk_area, "value": round(float(val) * 100, 1)})
        elif scope == "regional":
            col = region
            if col in df_global.columns:
                for idx, row in df_global.iterrows():
                    risk_area = str(row.get("Risk Area", "")).strip()
                    val = row.get(col)
                    if pd.notnull(val) and risk_area:
                        left_data.append({"name": risk_area, "value": round(float(val) * 100, 1)})
        elif scope == "industry":
            mapping = INDUSTRY_MAPPING.get(industry, {})
            col = mapping.get("risk_col", "Manufacturing")
            if col in df_ind.columns:
                for idx, row in df_ind.iterrows():
                    risk_area = str(row.get("Risk Area", "")).strip()
                    val = row.get(col)
                    if pd.notnull(val) and risk_area:
                        left_data.append({"name": risk_area, "value": round(float(val) * 100, 1)})
                        
        left_data = sorted(left_data, key=lambda x: x["value"], reverse=True)[:7]
        
        # 2. Right Chart: Top Fraud Schemes
        right_data = []
        row_industry_name = mapping.get("fraud_row", "Manufacturing") if 'mapping' in locals() else "Manufacturing"
        
        # Find matching row in Industry column
        fraud_row = df_fraud[df_fraud["Industry"].fillna("").astype(str).str.strip().str.lower() == row_industry_name.lower()]
        if not fraud_row.empty:
            cols = [c for c in df_fraud.columns if c != "Industry"]
            row_dict = fraud_row.iloc[0].to_dict()
            for c in cols:
                val = row_dict.get(c)
                if pd.notnull(val):
                    right_data.append({"name": c, "value": round(float(val) * 100, 1)})
                    
        right_data = sorted(right_data, key=lambda x: x["value"], reverse=True)[:7]
        
        return jsonify({
            "success": True,
            "leftChart": left_data,
            "rightChart": right_data
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e), "leftChart": [], "rightChart": []}), 500


@dashboard_bp.route("/api/post-to-production", methods=["POST"])
def post_to_production():
    body = request.get_json(silent=True) or {}
    tenant_id = body.get("tenant_id", "CJSJ")
    global_fields = body.get("global_fields", {})
    audit_plan_rows = body.get("rows", [])
    
    # Get active RCM rows from context memory if available
    tenant_mem = data_context_engine._memory.get(tenant_id, {})
    active_rcm_rows = tenant_mem.get("rows", [])
    filename = tenant_mem.get("filename", "")
    
    try:
        from utils.postgres_db import save_audit_session_data
        save_audit_session_data(
            tenant_id=tenant_id,
            filename=filename,
            active_rcm_rows=active_rcm_rows,
            audit_plan_rows=audit_plan_rows,
            global_fields=global_fields
        )
        return jsonify({
            "success": True,
            "message": "Audit plan successfully posted to production PostgreSQL!"
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Failed to post to production database: {str(e)}"
        }), 500


@dashboard_bp.route("/api/plants", methods=["GET"])
def get_plants():
    try:
        from utils.postgres_db import get_connection
        import pandas as pd
        conn = get_connection()
        try:
            df = pd.read_sql("SELECT * FROM sentinel_db.ref_plant;", conn)
        finally:
            conn.close()

        if df.empty:
            return jsonify([])
        first_col = df.columns[0]
        name_col = df.columns[1] if len(df.columns) > 1 else first_col
        plants = []
        for _, row in df.iterrows():
            code = str(row[first_col]).strip()
            name = str(row[name_col]).strip() if name_col else code
            plants.append({"code": code, "name": f"{code} - {name}"})
        return jsonify(plants)
    except Exception as e:
        print("Error reading ref_plant table:", e)
        return jsonify([])




