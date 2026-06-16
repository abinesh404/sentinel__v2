import os
from flask import Blueprint, request
from utils.safe_json_response import safe_jsonify as jsonify
from werkzeug.utils import secure_filename
from services.tenant_manager import tenant_manager
from services.workflow_orchestrator import orchestrator
from services.workbook_loader import read_tabular_file
from services.data_context_engine import data_context_engine


upload_bp = Blueprint("upload", __name__)

@upload_bp.route("/api/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    f = request.files["file"]
    if f.filename == "":
        return jsonify({"error": "No file selected"}), 400

    # ── MULTI-TENANT ISOLATION ──
    tenant_id = request.form.get("tenant_id", "CJSJ")
    upload_dir = tenant_manager.get_upload_dir(tenant_id)
    
    filename = secure_filename(f.filename)
    file_path = os.path.join(upload_dir, filename)
    f.save(file_path)

    try:
        df, workbook_meta = read_tabular_file(file_path)
    except Exception as e:
        return jsonify({"error": f"Failed to parse file: {str(e)}"}), 400

    # Execute Standard Data Pipeline
    response = orchestrator.execute_upload_pipeline(
        tenant_id,
        df,
        filename,
        workbook_meta=workbook_meta,
    )
    
    if response.status == "error":
        return jsonify({
            "success": False,
            "error": "Pipeline failed",
            "validationErrors": response.errors,
            "validationWarnings": response.data.get("warnings", [])
        }), 400

    return jsonify({
        "success": True,
        **response.data
    })


@upload_bp.route("/api/select-file", methods=["POST"])
def select_file():
    body = request.get_json(silent=True) or {}
    filename = body.get("filename")
    tenant_id = body.get("tenant_id", "CJSJ")

    if not filename:
        return jsonify({"error": "No filename specified"}), 400

    upload_dir = tenant_manager.get_upload_dir(tenant_id)
    filename = secure_filename(filename)
    file_path = os.path.join(upload_dir, filename)

    if not os.path.exists(file_path):
        return jsonify({"error": f"File {filename} not found in uploads"}), 404

    try:
        df, workbook_meta = read_tabular_file(file_path)
    except Exception as e:
        return jsonify({"error": f"Failed to parse file: {str(e)}"}), 400

    # Execute Standard Data Pipeline
    response = orchestrator.execute_upload_pipeline(
        tenant_id,
        df,
        filename,
        workbook_meta=workbook_meta,
    )
    
    if response.status == "error":
        return jsonify({
            "success": False,
            "error": "Pipeline failed",
            "validationErrors": response.errors,
            "validationWarnings": response.data.get("warnings", [])
        }), 400

    return jsonify({
        "success": True,
        **response.data
    })


@upload_bp.route("/api/list-files", methods=["GET"])
def list_files():
    tenant_id = request.args.get("tenant_id", "CJSJ")
    upload_dir = tenant_manager.get_upload_dir(tenant_id)
    
    import glob
    import datetime
    from services.workbook_loader import read_tabular_file
    
    files = []
    for ext in ["*.xlsx", "*.xls", "*.csv"]:
        files.extend(glob.glob(os.path.join(upload_dir, ext)))
        
    response_files = []
    for f in files:
        base = os.path.basename(f)
        if "auditor" in base.lower() or "audit_plan" in base.lower() or "audit plan" in base.lower():
            continue
            
        mtime = os.path.getmtime(f)
        uploaded_at = datetime.datetime.fromtimestamp(mtime).isoformat()
        
        try:
            df_temp, _ = read_tabular_file(f)
            total_rows = len(df_temp)
            cols = list(df_temp.columns)
        except Exception:
            total_rows = 0
            cols = []
            
        response_files.append({
            "filename": base,
            "totalRows": total_rows,
            "columns": cols,
            "uploadedAt": uploaded_at
        })
        
    response_files.sort(key=lambda x: x["uploadedAt"], reverse=True)
    return jsonify(response_files)


@upload_bp.route("/api/delete-file", methods=["POST"])
def delete_file():
    body = request.get_json(silent=True) or {}
    filename = body.get("filename")
    tenant_id = body.get("tenant_id", "CJSJ")
    
    if not filename:
        return jsonify({"error": "No filename specified"}), 400
        
    upload_dir = tenant_manager.get_upload_dir(tenant_id)
    filename = secure_filename(filename)
    file_path = os.path.join(upload_dir, filename)
    
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            # Clear active memory if this was the active file
            tenant_mem = data_context_engine._memory.get(tenant_id, {})
            if tenant_mem.get("filename") == filename:
                data_context_engine.clear(tenant_id)
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"error": f"Failed to delete file: {str(e)}"}), 500
            
    return jsonify({"error": "File not found"}), 404


@upload_bp.route("/api/preview-file", methods=["GET"])
def preview_file():
    filename = request.args.get("filename")
    tenant_id = request.args.get("tenant_id", "CJSJ")
    
    if not filename:
        return jsonify({"error": "No filename specified"}), 400
        
    upload_dir = tenant_manager.get_upload_dir(tenant_id)
    filename = secure_filename(filename)
    file_path = os.path.join(upload_dir, filename)
    
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404
        
    try:
        df, _ = read_tabular_file(file_path)
        
        # Replace NaN/NaT values so they serialize nicely to JSON
        df_cleaned = df.copy()
        import math
        import pandas as pd
        
        # Convert df to records
        rows = []
        for idx, row in df_cleaned.iterrows():
            r_dict = {}
            for col in df_cleaned.columns:
                val = row[col]
                if pd.isnull(val) or (isinstance(val, float) and (math.isnan(val) or math.isinf(val))):
                    r_dict[col] = None
                else:
                    r_dict[col] = str(val)
            rows.append(r_dict)
            
        columns = list(df_cleaned.columns)
        
        return jsonify({
            "success": True,
            "filename": filename,
            "columns": columns,
            "rows": rows[:100]  # Limit to first 100 rows for preview performance
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to preview file: {str(e)}"}), 500



