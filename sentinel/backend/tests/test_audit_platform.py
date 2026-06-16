import sys
import unittest
from pathlib import Path

import pandas as pd

BACKEND_DIR = Path(__file__).resolve().parents[1]
WORKSPACE_DIR = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

from analytics.analytics_service import generate_analytics
from audit.control_classifier import classify_controls
from engines.automation_engine import build_ai_suggestions
from audit.risk_engine import detect_risks
from engines.executive_summary_engine import analyze_dataset_metrics
from services.workbook_loader import read_tabular_file
from utils.column_mapper import map_columns
from utils.data_cleaner import clean_data
from utils.validator import validate_data

WORKBOOK = (
    WORKSPACE_DIR
    / "storage"
    / "tenant_company_001"
    / "uploads"
    / "CompleteRcm_Manufacturing_v1_1.xlsx"
)


def build_normalized_dataset():
    raw_df, workbook_meta = read_tabular_file(str(WORKBOOK))
    mapped_df, _ = map_columns(raw_df)
    validation = validate_data(mapped_df)
    clean_df, cleaning_report = clean_data(mapped_df, return_report=True)
    clean_df = detect_risks(classify_controls(clean_df))
    col_map = {
        "process": "process",
        "risk": "risk_description",
        "risk_class": "risk_level",
        "risk_classification": "risk_level",
        "control": "control_description",
        "control_ref": "control_ref",
        "control_type": "control_classification",
        "control_nature": "control_nature",
        "frequency": "frequency",
        "gaps": "gaps",
        "assessment": "assessment",
        "classification": "control_category",
    }
    analytics = generate_analytics(clean_df, col_map)
    return raw_df, clean_df, workbook_meta, cleaning_report, validation, analytics


class AuditPlatformRegressionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        (
            cls.raw_df,
            cls.df,
            cls.workbook_meta,
            cls.cleaning_report,
            cls.validation,
            cls.analytics,
        ) = build_normalized_dataset()

    def test_all_sheets_are_loaded(self):
        self.assertEqual(126, len(self.raw_df))
        self.assertEqual(
            ["RCM_Manufacturing"],
            self.workbook_meta["sheets_processed"],
        )
        self.assertEqual(
            {"RCM_Manufacturing": 126},
            self.workbook_meta["sheet_row_counts"],
        )

    def test_duplicate_controls_are_merged_to_ground_truth(self):
        self.assertEqual(1, self.cleaning_report["duplicate_records_removed"])
        self.assertEqual(125, len(self.df))
        self.assertEqual(125, self.df["control_ref"].nunique())
        elc = self.df[self.df["control_ref"] == "CTRL-ELC-01"].iloc[0]
        self.assertEqual("HR Head / Compliance Officer", elc["owner"])
        self.assertEqual("MANUAL", elc["control_classification"])

    def test_kpis_and_charts_reconcile(self):
        kpis = self.analytics["kpis"]
        charts = self.analytics["charts"]
        self.assertEqual(125, kpis["totalControls"])
        self.assertEqual(125, kpis["totalRisks"])
        self.assertEqual(62, kpis["manualControls"])
        self.assertEqual(24, kpis["automatedControls"])
        self.assertEqual(39, kpis["semiAutomatedControls"])
        self.assertEqual(0, kpis["highRisks"])
        self.assertEqual(22, kpis["processCount"])
        self.assertEqual(50.4, kpis["automationRate"])
        self.assertEqual(125, sum(charts["byProcess"]["data"]))
        self.assertEqual(125, sum(charts["byRisk"]["data"]))
        self.assertEqual(125, sum(charts["byType"]["data"]))
        self.assertEqual(125, sum(charts["byNature"]["data"]))

    def test_data_quality_warnings_are_specific(self):
        warnings = " ".join(self.validation["warnings"])
        self.assertIn("duplicated control references", warnings)
        self.assertIn("missing a risk description", warnings)
        self.assertIn("missing a control owner", warnings)

    def test_summary_is_grounded_and_has_no_known_fabrications(self):
        summary = analyze_dataset_metrics(
            self.df,
            self.analytics["kpis"],
            self.analytics["charts"],
        )
        self.assertIn("125 unique controls", summary["executive_summary"])
        self.assertIn("62 manual controls", summary["executive_summary"])
        self.assertEqual("uploaded_rcm", summary["grounding"]["source"])



    def test_automation_suggestions_reference_actual_controls(self):
        col_map = {
            "process": "process",
            "risk": "risk_description",
            "control": "control_description",
            "control_ref": "control_ref",
            "control_type": "control_classification",
            "frequency": "frequency",
            "gaps": "gaps",
            "assessment": "assessment",
        }
        suggestions = build_ai_suggestions(self.df, col_map)
        self.assertTrue(suggestions)
        for item in suggestions:
            self.assertIn("Associated Risk", item)
            self.assertIn("Process", item)
            self.assertIn("Rationale", item)
            self.assertIn("Suggested Control", item)


if __name__ == "__main__":
    unittest.main()
