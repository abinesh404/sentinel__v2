from utils.contracts import ServiceResponse
from services.distribution_validator import compute_distribution_metrics
from utils.logger import log_event, log_error

from services.data_context_engine import data_context_engine
import pandas as pd
import math
import os


def get_classified_row_data(row, idx, col_map):
    from engines.automation_engine import (
        calculate_risk_score,
        determine_automation_potential,
        determine_implementation_complexity,
        determine_expected_benefit,
    )
    
    proc_text = str(row.get(col_map.get("process", ""), "") or "").strip()
    ref_text = str(row.get(col_map.get("control_ref", ""), "") or f"Row {idx + 1}").strip()
    type_text = str(row.get(col_map.get("control_type", ""), "") or "").strip()
    freq_text = str(row.get(col_map.get("frequency", ""), "") or "").strip()
    risk_text = str(row.get(col_map.get("risk", ""), "") or "").strip()
    ctrl_text = str(row.get(col_map.get("control", ""), "") or "").strip()
    nature_text = str(row.get(col_map.get("control_nature", ""), "") or "").strip()
    
    score, severity, nature = calculate_risk_score(type_text, freq_text, ctrl_text, risk_text, nature_text)
    potential = determine_automation_potential(type_text, freq_text)
    complexity = determine_implementation_complexity(potential)
    benefit = determine_expected_benefit(type_text, freq_text, proc_text, ctrl_text)
    
    # Calculate Heuristic Confidence based on fields completeness
    missing_fields = [f for f in [proc_text, ref_text, type_text, freq_text, ctrl_text] if not f or f in ("Unknown Process", "Unreferenced", "Periodic")]
    confidence = 94 - (len(missing_fields) * 12)
    if "High" in severity:
        confidence -= 3
    if "MANUAL" in type_text.upper():
        confidence += 4
    if nature_text:
        confidence += 2
    confidence = max(60, min(99, confidence))
    
    enterprise_rec = f"Implement workflow-driven automation for the {proc_text} process to achieve {benefit.lower()}."
    
    return {
        "controlRef": ref_text,
        "process": proc_text,
        "controlType": type_text.title() if type_text else "Manual",
        "frequency": freq_text.title() if freq_text else "Periodic",
        "bestRecommendation": enterprise_rec,
        "expectedImpact": benefit,
        "automationReadiness": potential,
        "implementationComplexity": complexity,
        "confidence": f"{confidence}%",
        "controlDescription": ctrl_text,
        "riskDescription": risk_text,
        "risk_score": score,
        "risk_level": severity,
        "control_nature": nature,
        "ai_category": "",
        "_original_row": row.to_dict(),
        "_idx": idx
    }


class WorkflowOrchestrator:
    """
    Central Pipeline Controller.
    Executes standard upload, control analysis, and dataset analysis pipelines.
    Uses 100% rule-based and percentage split logic.
    """
    
    def execute_upload_pipeline(
        self,
        tenant_id: str,
        df: pd.DataFrame,
        filename: str,
        workbook_meta: dict | None = None,
    ) -> ServiceResponse:
        log_event("PIPELINE_START", tenant_id, {"pipeline": "upload", "filename": filename})
        try:
            # 1. Column Mapper (Dynamic)
            from utils.column_mapper import map_columns
            df, original_col_map = map_columns(df)
            
            # 2. Validate the raw mapped data so duplicate evidence is not lost.
            from utils.validator import validate_data
            validation_results = validate_data(df)
            if validation_results["errors"]:
                log_error("VALIDATION_FAILED", tenant_id, str(validation_results["errors"]))
                return ServiceResponse.error(errors=validation_results["errors"], data={"warnings": validation_results["warnings"]})

            # 3. Cleaning and duplicate control merge
            from utils.data_cleaner import clean_data
            df, cleaning_report = clean_data(df, return_report=True)
            if cleaning_report["duplicate_records_removed"]:
                validation_results["warnings"].append(
                    f"Merged {cleaning_report['duplicate_records_removed']} duplicate control records."
                )
            workbook_meta = workbook_meta or {}
            if workbook_meta.get("malformed_headers"):
                validation_results["warnings"].append(
                    "Normalized malformed headers: "
                    + ", ".join(workbook_meta["malformed_headers"])
                    + "."
                )
            
            # 4. Classification & Risk Engine
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
            

            # 5. Analytics
            from analytics.analytics_service import generate_analytics
            analytics = generate_analytics(df, standard_col_map)
            kpis = analytics["kpis"]
            charts = analytics["charts"]
            
            # 6. Semantic classification using insights.csv knowledge base
            from services.insights_classifier import load_insights_library, classify_control as _classify_control

            # Resolve path to insights.csv relative to project root (works on any machine)
            _insights_path = os.path.join(
                os.path.dirname(__file__), "..", "..", "source_data", "insights.csv"
            )
            _insights_library = load_insights_library(os.path.abspath(_insights_path))

            classified_tabs = {
                "complibear_integrated": [],
                "ready_for_deployment": [],
                "low_hanging_fruits": [],
                "ai_suggestions": []
            }

            for idx, row in df.iterrows():
                row_data = get_classified_row_data(row, idx, standard_col_map)

                ctrl_text    = str(row.get(standard_col_map.get("control", ""), "") or "")
                risk_text    = str(row.get(standard_col_map.get("risk", ""), "") or "")
                ctrl_type    = str(row.get(standard_col_map.get("control_type", ""), "") or "")
                freq_text    = str(row.get(standard_col_map.get("frequency", ""), "") or "")

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
                    
            # 7. Suggestions (Deterministic from automation engine)
            from engines.automation_engine import build_ai_suggestions
            ai_suggs = build_ai_suggestions(df, standard_col_map)
            classified_tabs["ai_suggestions"] = ai_suggs
            
            from audit.audit_priority_engine import build_audit_plan
            audit_plan = build_audit_plan(df, standard_col_map)
            
            # 8. Top 5 Risk Categories Engine
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

            
            import numpy as np
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
            
            # 9. Store in Context Memory
            data_context_engine.set_dataframe(tenant_id, df, filename)
            data_context_engine.set_metrics(tenant_id, kpis, charts)
            
            data_context_engine._init_tenant(tenant_id)
            data_context_engine._memory[tenant_id]["rows"] = rows
            data_context_engine._memory[tenant_id]["columns"] = df.columns.tolist()
            data_context_engine._memory[tenant_id]["column_map"] = original_col_map
            data_context_engine._memory[tenant_id]["audit_plan"] = audit_plan
            data_context_engine._memory[tenant_id]["ai_suggestions"] = ai_suggs
            data_context_engine._memory[tenant_id]["top_5_risks"] = top_5_risks
            data_context_engine._memory[tenant_id]["classified_tabs"] = classified_tabs
            
            # Compute distribution metrics
            distribution_metrics = compute_distribution_metrics(classified_tabs)
            data_context_engine._memory[tenant_id]["validation_warnings"] = validation_results["warnings"]
            
            data_quality = {
                "rawRows": workbook_meta.get("raw_rows", len(df)),
                "cleanRows": len(df),
                "sheetsProcessed": workbook_meta.get("sheets_processed", []),
                "sheetRowCounts": workbook_meta.get("sheet_row_counts", {}),
                "duplicateRecordsMerged": cleaning_report["duplicate_records_removed"],
            }
            data_context_engine._memory[tenant_id]["data_quality"] = data_quality
            
            # Save to PostgreSQL database immediately upon upload/selection
            try:
                from utils.postgres_db import save_uploaded_rcm_data
                save_uploaded_rcm_data(tenant_id, filename, rows)
            except Exception as db_err:
                print(f"[PostgreSQL] Failed to auto-save uploaded RCM: {db_err}")
                import traceback
                traceback.print_exc()

            log_event("PIPELINE_SUCCESS", tenant_id, {"pipeline": "upload"})
            return ServiceResponse.success(data={
                "filename": filename,
                "totalRows": len(rows),
                "columns": df.columns.tolist(),
                "columnMap": original_col_map,
                "rows": rows,
                "chartData": charts,
                "auditPlan": audit_plan,
                "aiSuggestions": ai_suggs,
                "top5Risks": top_5_risks,
                "classifiedTabs": classified_tabs,
                "distributionMetrics": distribution_metrics,
                "kpis": kpis,
                "validationWarnings": validation_results["warnings"],
                "dataQuality": data_quality,
            })
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            log_error("PIPELINE_FAILED", tenant_id, str(e))
            return ServiceResponse.error(errors=[str(e)])

    def execute_control_analysis_pipeline(self, tenant_id: str, control_data: dict) -> ServiceResponse:
        log_event("PIPELINE_START", tenant_id, {"pipeline": "control_analysis"})
        try:
            from engines.automation_engine import (
                calculate_risk_score,
                determine_automation_potential,
                determine_implementation_complexity,
                determine_expected_benefit,
            )
            
            proc = control_data.get("process", "") or control_data.get("Process", "")
            ctrl = control_data.get("control_description", "") or control_data.get("controlDescription", "") or control_data.get("Control Description", "")
            risk = control_data.get("risk_description", "") or control_data.get("riskDescription", "") or control_data.get("Risk Description", "")
            freq = control_data.get("frequency", "") or control_data.get("Frequency", "")
            nature = control_data.get("control_nature", "") or control_data.get("controlNature", "") or control_data.get("Control Nature", "")
            ref = control_data.get("control_ref", "") or control_data.get("controlRefNo", "") or control_data.get("Control Ref No", "")
            ctype = control_data.get("control_classification", "") or control_data.get("controlType", "") or control_data.get("Control Type", "")
            
            score, severity, control_nature = calculate_risk_score(ctype, freq, ctrl, risk, nature)
            benefit = determine_expected_benefit(ctype, freq, proc, ctrl)
            
            enterprise_rec = f"Implement workflow-driven automation for the {proc} process to achieve {benefit.lower()}."
            
            result = {
                "risk_level": severity.upper(),
                "key_concern": risk or "General operational risk.",
                "recommendation": enterprise_rec,
                "automation_opportunity": benefit,
                "control_reference": ref,
                "source_control": ctrl,
            }
            log_event("PIPELINE_SUCCESS", tenant_id, {"pipeline": "control_analysis"})
            return ServiceResponse.success(data=result)
        except Exception as e:
            log_error("PIPELINE_FAILED", tenant_id, str(e))
            return ServiceResponse.error(errors=[str(e)])

    def execute_dataset_analysis_pipeline(self, tenant_id: str) -> ServiceResponse:
        log_event("PIPELINE_START", tenant_id, {"pipeline": "dataset_analysis"})
        try:
            df = data_context_engine.get_dataframe(tenant_id)
            kpis, charts = data_context_engine.get_metrics(tenant_id)
            
            if df is None or df.empty:
                return ServiceResponse.error(errors=["No dataset uploaded"])
                
            from engines.executive_summary_engine import analyze_dataset_metrics
            result = analyze_dataset_metrics(df, kpis, charts)
            
            log_event("PIPELINE_SUCCESS", tenant_id, {"pipeline": "dataset_analysis"})
            return ServiceResponse.success(data=result)
        except Exception as e:
            log_error("PIPELINE_FAILED", tenant_id, str(e))
            return ServiceResponse.error(errors=[str(e)])


# Singleton
orchestrator = WorkflowOrchestrator()
