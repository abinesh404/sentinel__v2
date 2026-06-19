import os
import csv
import time
import traceback
import psycopg2
from psycopg2.extras import execute_values

DB_URL = "postgresql://neondb_owner:npg_5wQeyoh4pxFT@ep-fragrant-dawn-at7nzvqv-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

def get_connection(retries=3, delay=2):
    """Establish a connection to PostgreSQL with retry logic."""
    for i in range(retries):
        try:
            conn = psycopg2.connect(DB_URL)
            with conn.cursor() as cursor:
                cursor.execute("SET search_path TO sentinel_db;")
            return conn
        except Exception as e:
            print(f"[PostgreSQL] Connection attempt {i+1} failed: {e}")
            if i < retries - 1:
                time.sleep(delay)
    raise Exception("Failed to connect to PostgreSQL after multiple attempts.")

def log_to_db(cursor, module_name, action, status):
    """Log an operation status directly into the database logs table."""
    try:
        cursor.execute(
            """
            INSERT INTO ai_logs (module_name, action, status, created_at)
            VALUES (%s, %s, %s, NOW())
            """,
            (module_name, action, status)
        )
    except Exception as e:
        print(f"[PostgreSQL] Failed to log to DB: {e}")

def setup_table(cursor, table_name, create_query, required_columns):
    """
    Ensures that a table exists and contains all required columns.
    If the table exists but is missing columns:
      - If the table is empty (0 rows), it drops and recreates it.
      - If the table contains data, it dynamically runs ALTER TABLE to add missing columns.
    """
    # Check if table exists
    cursor.execute(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = CURRENT_SCHEMA() AND table_name = %s)",
        (table_name,)
    )
    exists = cursor.fetchone()[0]
    
    if not exists:
        print(f"[PostgreSQL] Creating table {table_name}...")
        cursor.execute(create_query)
        return

    # Check columns
    cursor.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = CURRENT_SCHEMA() AND table_name = %s",
        (table_name,)
    )
    existing_cols = {r[0].lower() for r in cursor.fetchall()}
    
    missing_cols = []
    for col in required_columns:
        if col.lower() not in existing_cols:
            missing_cols.append(col)
            
    if missing_cols:
        print(f"[PostgreSQL] Table {table_name} is missing columns: {missing_cols}")
        # Check if table has rows
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        row_count = cursor.fetchone()[0]
        
        if row_count == 0:
            print(f"[PostgreSQL] Table {table_name} is empty. Dropping and recreating...")
            cursor.execute(f"DROP TABLE IF EXISTS {table_name} CASCADE")
            cursor.execute(create_query)
        else:
            print(f"[PostgreSQL] Table {table_name} has data ({row_count} rows). Performing ALTER TABLE migrations...")
            for col in missing_cols:
                # Determine data type based on column name
                dtype = "TEXT"
                if "index" in col.lower():
                    dtype = "TEXT"
                elif "score" in col.lower() or "id" in col.lower() or col.lower() in ("row", "column"):
                    dtype = "INTEGER"
                elif "date_time" in col.lower() or "datetime" in col.lower():
                    dtype = "TIMESTAMP"
                elif "date" in col.lower():
                    dtype = "DATE"
                
                # Double quote column names that contain spaces or keywords
                col_identifier = f'"{col}"' if (' ' in col or col.lower() in ('index', 'row', 'column', 'date')) else col
                cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {col_identifier} {dtype}")
                print(f"[PostgreSQL] Added column {col_identifier} to {table_name}")

def create_tables_if_not_exist():
    """Ensure all required tables exist in PostgreSQL database."""
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            # 1. ai_logs table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS ai_logs (
                    id SERIAL PRIMARY KEY,
                    module_name TEXT,
                    action TEXT,
                    status TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                );
                """
            )

            # Header tables
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS input_rcm_header (
                    "index" SERIAL PRIMARY KEY,
                    "file_name" TEXT,
                    "row" INT,
                    "column" INT,
                    "date" TIMESTAMP DEFAULT NOW()
                );
                """
            )

            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS audit_plan_header (
                    "index" SERIAL PRIMARY KEY,
                    "file_name" TEXT,
                    "row" INT,
                    "column" INT,
                    "date" TIMESTAMP DEFAULT NOW()
                );
                """
            )

            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS insights_current_header (
                    "index" SERIAL PRIMARY KEY,
                    "file_name" TEXT,
                    "row" INT,
                    "column" INT,
                    "date" TIMESTAMP DEFAULT NOW()
                );
                """
            )
            
            # 2. insights_current table
            insights_sql = """
                CREATE TABLE insights_current (
                    id SERIAL PRIMARY KEY,
                    insight_id INT UNIQUE,
                    category TEXT,
                    title TEXT,
                    description TEXT,
                    file_name TEXT,
                    "index" INT,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            """
            setup_table(
                cursor, 
                "insights_current", 
                insights_sql, 
                ["insight_id", "category", "title", "description", "file_name", "index"]
            )

            # 3. input_rcm table - user custom columns
            rcm_sql = """
                CREATE TABLE input_rcm (
                    id SERIAL PRIMARY KEY,
                    tenant_id TEXT,
                    "Process" TEXT,
                    "Risk number" TEXT,
                    "Control Classification" TEXT,
                    "Risk Description" TEXT,
                    "Risk Classification" TEXT,
                    "Control Ref No" TEXT,
                    "Control Activity / Description" TEXT,
                    "Control Nature" TEXT,
                    "Control Type" TEXT,
                    "Occurance" TEXT,
                    "Control Activity Frequency" TEXT,
                    "Control Performed by" TEXT,
                    "Design Assessment Result" TEXT,
                    "Gaps Noted (if any)" TEXT,
                    "Attribute" TEXT,
                    "Data Request" TEXT,
                    "Remarks" TEXT,
                    "Others" TEXT,
                    "file name" TEXT,
                    "index" TEXT,
                    "audit_plan" TEXT,
                    "create date" TIMESTAMP DEFAULT NOW(),
                    "updated date" TIMESTAMP DEFAULT NOW()
                );
            """
            setup_table(
                cursor, 
                "input_rcm", 
                rcm_sql, 
                [
                    "tenant_id", "Process", "Risk number", "Control Classification",
                    "Risk Description", "Risk Classification", "Control Ref No",
                    "Control Activity / Description", "Control Nature", "Control Type",
                    "Occurance", "Control Activity Frequency", "Control Performed by",
                    "Design Assessment Result", "Gaps Noted (if any)", "Attribute",
                    "Data Request", "Remarks", "Others", "file name", "index",
                    "audit_plan", "create date", "updated date"
                ]
            )

            # 4. audit_plan table
            plan_sql = """
                CREATE TABLE audit_plan (
                    plan_db_id SERIAL PRIMARY KEY,
                    company TEXT,
                    sector TEXT,
                    id TEXT,
                    title TEXT,
                    "Risk description" TEXT,
                    control_description TEXT,
                    audit_type TEXT,
                    risk_level TEXT,
                    "rick score" INT,
                    process TEXT,
                    start_date DATE,
                    end_date DATE,
                    current_phase TEXT,
                    sub_stage TEXT,
                    status TEXT,
                    auditor TEXT,
                    created_by_user_id TEXT,
                    audit_name TEXT,
                    file_name TEXT,
                    "index" TEXT,
                    plant TEXT,
                    lead_auditor TEXT,
                    audit_description TEXT,
                    department TEXT,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            """
            setup_table(
                cursor, 
                "audit_plan", 
                plan_sql, 
                [
                    "company", "sector", "id", "title", "Risk description", "control_description",
                    "audit_type", "risk_level", "rick score", "process", "start_date", "end_date",
                    "current_phase", "sub_stage", "status", "auditor", "created_by_user_id", "audit_name",
                    "file_name", "index", "plant", "lead_auditor", "audit_description", "department"
                ]
            )
            
            conn.commit()
            print("[PostgreSQL] Tables verified/created successfully.")
    except Exception as e:
        conn.rollback()
        print(f"[PostgreSQL] Error during table creation: {e}")
        raise e
    finally:
        conn.close()

def seed_insights_from_csv():
    """Seed the insights_current table with data from insights.csv."""
    insights_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "source_data", "insights.csv"))
    if not os.path.exists(insights_path):
        print(f"[PostgreSQL] insights.csv not found at {insights_path}")
        return

    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            # Read insights.csv to get the row count and column count
            rows_count = 0
            cols_count = 0
            with open(insights_path, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                cols_count = len(reader.fieldnames) if reader.fieldnames else 0
                rows_count = sum(1 for _ in reader)

            # Ensure a header entry exists
            cursor.execute("SELECT \"index\" FROM insights_current_header WHERE file_name = %s LIMIT 1", ("insights.csv",))
            header_res = cursor.fetchone()
            if not header_res:
                cursor.execute(
                    """
                    INSERT INTO insights_current_header (file_name, row, "column", date)
                    VALUES (%s, %s, %s, NOW()) RETURNING "index"
                    """,
                    ("insights.csv", rows_count, cols_count)
                )
                insights_header_id = cursor.fetchone()[0]
            else:
                insights_header_id = header_res[0]

            # Check if insights are already populated to save time
            cursor.execute("SELECT COUNT(*) FROM insights_current")
            count = cursor.fetchone()[0]
            if count > 0:
                print(f"[PostgreSQL] insights_current already populated ({count} records). Skipping seeding.")
                # Backfill header index and file_name if any are NULL
                cursor.execute("SELECT COUNT(*) FROM insights_current WHERE \"index\" IS NULL OR file_name IS NULL")
                null_count = cursor.fetchone()[0]
                if null_count > 0:
                    print(f"[PostgreSQL] Backfilling {null_count} insights_current rows with header index {insights_header_id}...")
                    cursor.execute(
                        """
                        UPDATE insights_current
                        SET file_name = %s, "index" = %s
                        WHERE "index" IS NULL OR file_name IS NULL
                        """,
                        ("insights.csv", insights_header_id)
                    )
                conn.commit()
                return

            print(f"[PostgreSQL] Seeding insights_current from {insights_path}...")
            with open(insights_path, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                rows_to_insert = []
                for row in reader:
                    # Map CSV columns: insight_id, category, title, description
                    try:
                        insight_id = int(row.get("insight_id", 0))
                        category = row.get("category", "")
                        title = row.get("title", "")
                        description = row.get("description", "")
                        rows_to_insert.append((insight_id, category, title, description, "insights.csv", insights_header_id))
                    except ValueError:
                        continue
                
                if rows_to_insert:
                    execute_values(
                        cursor,
                        """
                        INSERT INTO insights_current (insight_id, category, title, description, file_name, "index")
                        VALUES %s
                        ON CONFLICT (insight_id) DO NOTHING
                        """,
                        rows_to_insert
                    )
            
            log_to_db(cursor, "insights_seeder", "seed_insights", "success")
            conn.commit()
            print(f"[PostgreSQL] Successfully seeded {len(rows_to_insert)} insights.")
    except Exception as e:
        conn.rollback()
        print(f"[PostgreSQL] Error seeding insights: {e}")
        traceback.print_exc()
    finally:
        conn.close()

def save_uploaded_rcm_data(tenant_id, filename, active_rcm_rows):
    """
    Save the uploaded RCM inputs and log status in PostgreSQL database.
    Called immediately upon upload/selection of RCM file.
    """
    create_tables_if_not_exist()
    
    if not active_rcm_rows:
        return True

    conn = get_connection()
    try:
        from datetime import datetime
        import math
        current_time = datetime.now()
        
        # Helper to dynamically retrieve case-insensitive & alias matched field values from RCM row dictionary
        def get_rcm_field(r, field_name):
            mapping = {
                "Process": ["process", "Process", "process_name"],
                "Risk number": ["risk_number", "Risk number", "riskNumber", "risk_no", "Risk No"],
                "Control Classification": ["control_classification", "Control Classification", "control_category", "classification"],
                "Risk Description": ["risk_description", "Risk Description", "risk_desc", "risk"],
                "Risk Classification": ["risk_classification", "Risk Classification", "risk_class", "risk_level"],
                "Control Ref No": ["control_ref", "Control Ref No", "controlRef", "control_ref_no"],
                "Control Activity / Description": ["control_description", "Control Activity / Description", "control", "controlDescription", "control_desc"],
                "Control Nature": ["control_nature", "Control Nature", "controlNature"],
                "Control Type": ["control_type", "Control Type", "controlType"],
                "Occurance": ["occurrence", "Occurance", "occurrence_val"],
                "Control Activity Frequency": ["frequency", "Control Activity Frequency", "frequency_val", "control_activity_frequency"],
                "Control Performed by": ["owner", "Control Performed by", "performed_by", "control_performed_by"],
                "Design Assessment Result": ["assessment", "Design Assessment Result", "design_assessment_result"],
                "Gaps Noted (if any)": ["gaps", "Gaps Noted (if any)", "gaps_noted_if_any"],
                "Attribute": ["attribute", "Attribute"],
                "Data Request": ["data_request", "Data Request"],
                "Remarks": ["remarks", "Remarks"],
                "Others": ["Others", "others"]
            }
            
            keys = mapping.get(field_name, [field_name])
            for k in keys:
                if k in r:
                    return r[k]
            # Fallback to case-insensitive check of all keys in r
            field_lower = field_name.lower().replace(" ", "").replace("_", "").replace("/", "").replace("(", "").replace(")", "")
            for k in r.keys():
                k_clean = str(k).lower().replace(" ", "").replace("_", "").replace("/", "").replace("(", "").replace(")", "")
                if k_clean == field_lower:
                    return r[k]
            return None

        with conn.cursor() as cursor:
            # 1. Insert header record
            cursor.execute(
                """
                INSERT INTO input_rcm_header (file_name, row, "column", date)
                VALUES (%s, %s, %s, %s) RETURNING "index"
                """,
                (filename or "unknown_file", len(active_rcm_rows), 20, current_time)
            )
            rcm_header_id = cursor.fetchone()[0]

            # 2. Get CJSJ001 style index string
            prefix = (tenant_id[:2].lower()) if tenant_id else "cj"
            index_str = f"{prefix}{rcm_header_id:03d}"

            db_cols = [
                "tenant_id", "Process", "Risk number", "Control Classification",
                "Risk Description", "Risk Classification", "Control Ref No",
                "Control Activity / Description", "Control Nature", "Control Type",
                "Occurance", "Control Activity Frequency", "Control Performed by",
                "Design Assessment Result", "Gaps Noted (if any)", "Attribute",
                "Data Request", "Remarks", "Others", "file name", "index",
                "create date", "updated date"
            ]

            # Build values tuple list
            rcm_values = []
            for r in active_rcm_rows:
                row_vals = []
                for col in db_cols:
                    if col == "tenant_id":
                        val = tenant_id
                    elif col == "file name":
                        val = filename or "unknown_file"
                    elif col == "index":
                        val = index_str
                    elif col == "create date" or col == "updated date":
                        val = current_time
                    else:
                        val = get_rcm_field(r, col)
                        # Handle float nan values to None
                        if isinstance(val, float) and math.isnan(val):
                            val = None
                        elif val is not None:
                            val = str(val).strip()
                            if val.lower() == "nan" or val == "":
                                val = None
                    row_vals.append(val)
                rcm_values.append(tuple(row_vals))
            
            # Construct query and execute
            col_list_str = ", ".join(f'"{col}"' for col in db_cols)
            query = f"INSERT INTO input_rcm ({col_list_str}) VALUES %s"
            execute_values(cursor, query, rcm_values)
            
            conn.commit()
            print(f"[PostgreSQL] Successfully saved uploaded RCM data to database with header index {index_str}")
            return True
    except Exception as e:
        conn.rollback()
        print(f"[PostgreSQL] Error saving uploaded RCM data: {e}")
        import traceback
        traceback.print_exc()
        raise e
    finally:
        conn.close()

def save_audit_session_data(tenant_id, filename, active_rcm_rows, audit_plan_rows, global_fields):
    """
    Save the RCM inputs, audit plan allocations, and log status in PostgreSQL database.
    Performs all inserts inside a single database transaction.
    """
    create_tables_if_not_exist()
    seed_insights_from_csv()

    conn = get_connection()
    try:
        from datetime import datetime
        current_time = datetime.now()
        audit_name = global_fields.get("auditName", "Standard Audit Plan")

        with conn.cursor() as cursor:
            # 1. Log Start of Post to Production
            log_to_db(cursor, "post_to_production", "post_start", "pending")

            # 2. Save active RCM rows to input_rcm if available
            # Note: We no longer insert rows into input_rcm here since they were inserted during upload.
            # Instead, we update the audit_plan column for the rows matching this filename.
            if active_rcm_rows:
                print(f"[PostgreSQL] Updating audit_plan column for RCM rows matching filename '{filename}'...")
                cursor.execute(
                    """
                    UPDATE input_rcm
                    SET audit_plan = %s
                    WHERE "file name" = %s
                    """,
                    (audit_name, filename or "unknown_file")
                )

            # 3. Save allocated audit plan rows to audit_plan
            if audit_plan_rows:
                print(f"[PostgreSQL] Saving {len(audit_plan_rows)} audit plan entries...")
                
                # Fetch company and sector from tenant settings or defaults
                company_name = tenant_id
                sector = "Manufacturing"  # Default fallback

                start_date = global_fields.get("startDate") or None
                end_date = global_fields.get("endDate") or None
                audit_type = global_fields.get("auditType", "Internal Audit")

                # Get new global fields
                selected_plants = global_fields.get("plants") or []
                if isinstance(selected_plants, list):
                    plant_val = ", ".join(str(p) for p in selected_plants) if selected_plants else "0"
                else:
                    plant_val = str(selected_plants).strip() or "0"
                
                lead_auditor = global_fields.get("leadAuditor") or ""
                audit_description = global_fields.get("auditDescription") or ""
                department_val = global_fields.get("department") or None

                # Build plan values and calculate row count
                temp_plan_values = []
                for row in audit_plan_rows:
                    row_id = row.get("id")
                    title = row.get("process_name")
                    risk_desc = row.get("risk_area")
                    risk_score = row.get("risk_score", 70)
                    risk_level = "HIGH" if risk_score >= 85 else "MEDIUM" if risk_score >= 40 else "LOW"
                    dept = row.get("process_name")
                    auditors = ", ".join(row.get("selectedAuditors", []))
                    
                    controls = row.get("controls", [])
                    if not controls:
                        controls = [""]

                    for ctrl in controls:
                        ctrl_id = None
                        if isinstance(ctrl, dict):
                            ctrl_desc = ctrl.get("control_description", ctrl.get("ControlDescription", ""))
                            ctrl_risk = ctrl.get("risk_description", ctrl.get("RiskDescription", ""))
                            ctrl_id = ctrl.get("risk_number")
                        else:
                            ctrl_desc = str(ctrl)
                            ctrl_risk = None
                            
                        if not ctrl_risk and active_rcm_rows and ctrl_desc:
                            import re
                            def clean_text_compare(t):
                                return re.sub(r'[^a-z0-9]', '', str(t).lower())
                            
                            cleaned_target = clean_text_compare(ctrl_desc)
                            if cleaned_target:
                                for r in active_rcm_rows:
                                    r_ctrl = str(r.get("control_description", r.get("controlDescription", r.get("control_desc", r.get("control", ""))))).strip()
                                    if clean_text_compare(r_ctrl) == cleaned_target:
                                        m_risk = r.get("riskDescription", r.get("risk_description", r.get("risk_desc", "")))
                                        if m_risk:
                                            m_risk_str = str(m_risk).strip()
                                            if m_risk_str.lower() != "nan" and m_risk_str != "":
                                                ctrl_risk = m_risk_str
                                                break

                        # Look up risk_number if not found in payload
                        if not ctrl_id and active_rcm_rows and ctrl_desc:
                            import re
                            def clean_text_compare(t):
                                return re.sub(r'[^a-z0-9]', '', str(t).lower())
                            
                            cleaned_target = clean_text_compare(ctrl_desc)
                            if cleaned_target:
                                for r in active_rcm_rows:
                                    r_ctrl = str(r.get("control_description", r.get("controlDescription", r.get("control_desc", r.get("control", ""))))).strip()
                                    if clean_text_compare(r_ctrl) == cleaned_target:
                                        ctrl_id = r.get("risk_number") or r.get("Risk number") or r.get("riskNumber") or r.get("risk_no") or r.get("Risk No")
                                        if ctrl_id:
                                            ctrl_id = str(ctrl_id).strip()
                                            if ctrl_id.lower() != "nan" and ctrl_id != "":
                                                break

                        final_risk_desc = ctrl_risk or risk_desc or "Operational Controls & Compliance"
                        final_id = ctrl_id or row_id or ""

                        temp_plan_values.append({
                            "company": company_name,
                            "sector": sector,
                            "id": final_id,
                            "title": title,
                            "risk_desc": final_risk_desc,
                            "ctrl_desc": ctrl_desc,
                            "audit_type": audit_type,
                            "risk_level": risk_level,
                            "risk_score": int(risk_score) if risk_score is not None else 70,
                            "process": dept,
                            "start_date": start_date,
                            "end_date": end_date,
                            "auditors": auditors,
                            "department": department_val
                        })

                # Insert header record for audit plan
                # Count is len(temp_plan_values), and the table has 25 columns
                cursor.execute(
                    """
                    INSERT INTO audit_plan_header (file_name, row, "column", date)
                    VALUES (%s, %s, %s, %s) RETURNING "index"
                    """,
                    (filename or "unknown_file", len(temp_plan_values), 25, current_time)
                )
                plan_header_id = cursor.fetchone()[0]

                # Get custom prefix and index string (e.g. cj001)
                prefix = (tenant_id[:2].lower()) if tenant_id else "cj"
                index_str = f"{prefix}{plan_header_id:03d}"

                plan_values = []
                for item in temp_plan_values:
                    plan_values.append((
                        item["company"],
                        item["sector"],
                        item["id"],
                        item["title"],
                        item["risk_desc"],
                        item["ctrl_desc"],
                        item["audit_type"],
                        item["risk_level"],
                        item["risk_score"],
                        item["process"],
                        item["start_date"],
                        item["end_date"],
                        "Planning",
                        "Audit Allocation",
                        "Active",
                        item["auditors"],
                        "system_user",
                        audit_name,
                        filename or "unknown_file",
                        index_str,
                        plant_val,
                        lead_auditor,
                        audit_description,
                        item["department"]
                    ))

                execute_values(
                    cursor,
                    """
                    INSERT INTO audit_plan (
                        company, sector, id, title, "Risk description", control_description,
                        audit_type, risk_level, "rick score", process, start_date, end_date,
                        current_phase, sub_stage, status, auditor, created_by_user_id, audit_name,
                        file_name, "index", plant, lead_auditor, audit_description, department
                    ) VALUES %s
                    """,
                    plan_values
                )

                # Also insert into readiness_db for ARM
                readiness_plan_values = []
                for item in temp_plan_values:
                    try:
                        read_id = int(item["id"])
                    except:
                        read_id = abs(hash(str(item["id"]))) % (10**8)
                    readiness_plan_values.append((
                        item["company"],
                        item["sector"],
                        read_id,
                        item["title"],
                        item["risk_desc"],
                        item["ctrl_desc"],
                        item["audit_type"],
                        item["risk_level"],
                        item["department"],
                        item["start_date"] or None,
                        item["end_date"] or None,
                        "Planning",
                        "Audit Allocation",
                        "Active",
                        item["auditors"],
                        1 # dummy user_id
                    ))

                execute_values(
                    cursor,
                    """
                    INSERT INTO readiness_db.audit_plan (
                        company, sector, id, title, "Risk description", control_description,
                        audit_type, risk_level, department, start_date, end_date,
                        current_phase, sub_stage, status, auditor, created_by_user_id
                    ) VALUES %s
                    """,
                    readiness_plan_values
                )

            # 4. Log Success
            log_to_db(cursor, "post_to_production", "post_success", "completed")
            
            conn.commit()
            print("[PostgreSQL] Audit data successfully posted to production in PostgreSQL.")
            return True
            
    except Exception as e:
        conn.rollback()
        print(f"[PostgreSQL] Transaction rolled back due to error: {e}")
        traceback.print_exc()
        raise e
    finally:
        conn.close()
