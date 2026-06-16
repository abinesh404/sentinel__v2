import sys
import unittest
from pathlib import Path
import pandas as pd

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from audit.top_risk_engine import (
    calculate_row_indicators,
    calculate_risk_scores,
    get_top_5_risks,
    get_process_controls,
    get_process_risks,
    generate_process_recommendations
)

class TestTopRiskEngine(unittest.TestCase):
    def setUp(self):
        # Create a mock RCM DataFrame
        self.mock_data = pd.DataFrame([
            {
                "process": "Procure to Pay",
                "control_ref": "CTRL-P2P-01",
                "control_description": "Manager manually signs off on purchases over $10k",
                "risk_description": "Unauthorized high value purchase without approval",
                "risk_level": "HIGH",
                "risk_score": 80,
                "control_classification": "MANUAL",
                "control_nature": "Detective",
                "frequency": "Daily",
                "gaps": "No documented review evidence",
                "assessment": "Ineffective",
                "remarks": "High fraud indicator noted"
            },
            {
                "process": "Procure to Pay",
                "control_ref": "CTRL-P2P-02",
                "control_description": "System checks for vendor duplicate bank accounts",
                "risk_description": "Duplicate payment to vendor",
                "risk_level": "LOW",
                "risk_score": 20,
                "control_classification": "AUTOMATED",
                "control_nature": "Preventive",
                "frequency": "Continuous",
                "gaps": "",
                "assessment": "Effective",
                "remarks": ""
            },
            {
                "process": "HR & Payroll",
                "control_ref": "CTRL-HR-01",
                "control_description": "Review monthly payroll register manually",
                "risk_description": "Incorrect salary payout",
                "risk_level": "MEDIUM",
                "risk_score": 50,
                "control_classification": "MANUAL",
                "control_nature": "Detective",
                "frequency": "Monthly",
                "gaps": "Lack of segregation of duties",
                "assessment": "Effective",
                "remarks": ""
            },
            {
                "process": "Finance & Accounts",
                "control_ref": "CTRL-FIN-01",
                "control_description": "System generated monthly bank reconciliation",
                "risk_description": "Unrecorded bank fees",
                "risk_level": "LOW",
                "risk_score": 10,
                "control_classification": "AUTOMATED",
                "control_nature": "Detective",
                "frequency": "Monthly",
                "gaps": "",
                "assessment": "Effective",
                "remarks": ""
            }
        ])

    def test_row_indicators(self):
        row = self.mock_data.iloc[0]
        indicators = calculate_row_indicators(row)
        self.assertEqual(indicators["high_risk"], 1)
        self.assertEqual(indicators["manual"], 1)
        self.assertEqual(indicators["failed"], 1)
        self.assertEqual(indicators["missing_approval"], 1)
        self.assertEqual(indicators["fraud"], 1)
        self.assertEqual(indicators["gap"], 1)
        self.assertEqual(indicators["missing_evidence"], 1)

    def test_calculate_risk_scores(self):
        scores = calculate_risk_scores(self.mock_data)
        self.assertIn("Procure to Pay", scores)
        self.assertIn("HR & Payroll", scores)
        self.assertIn("Finance & Accounts", scores)

        p2p_score = scores["Procure to Pay"]["risk_score"]
        # CTRL-P2P-01: high risk (40), manual (10), failed (20), gap (15), fraud (25), missing approval (15) -> total = 125
        # CTRL-P2P-02: none of the above -> 0
        # total_controls = 2
        # denominator = min(2, 3) * 1.25 = 2.5
        # risk_score = min(100, round(125 / 2.5)) = 50
        self.assertEqual(p2p_score, 50)
        self.assertEqual(scores["Procure to Pay"]["audit_priority"], "MEDIUM")

    def test_get_top_5_risks(self):
        top_5 = get_top_5_risks(self.mock_data)
        # Should be sorted descending by risk score
        self.assertTrue(len(top_5) <= 5)
        self.assertEqual(top_5[0]["process"], "Procure to Pay") # highest score
        self.assertEqual(top_5[1]["process"], "HR & Payroll")

    def test_get_process_controls(self):
        p2p_ctrls = get_process_controls(self.mock_data, "Procure to Pay")
        self.assertEqual(len(p2p_ctrls), 2)
        self.assertEqual(p2p_ctrls.iloc[0]["control_ref"], "CTRL-P2P-01")

    def test_generate_process_recommendations(self):
        recs = generate_process_recommendations(self.mock_data, "Procure to Pay")
        self.assertIn("recommendations", recs)
        self.assertIn("automation_opportunities", recs)
        self.assertIn("expected_audit_impact", recs)
        
        # Recommendations should be evidence-based and mention control references
        recommendations_str = " ".join(recs["recommendations"])
        self.assertIn("CTRL-P2P-01", recommendations_str)
        self.assertIn("remediate failed controls", recommendations_str.lower())

        # Automation opportunities should reference the manual control
        automation_str = " ".join(recs["automation_opportunities"])
        self.assertIn("CTRL-P2P-01", automation_str)

        # Expected audit impact should reference counts and point values
        self.assertIn("remediating 1 failed controls", recs["expected_audit_impact"].lower())

if __name__ == "__main__":
    unittest.main()
