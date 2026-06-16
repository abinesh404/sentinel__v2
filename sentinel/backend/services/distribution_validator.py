"""Distribution validator for semantic classification engine.

Computes bucket percentages and logs warnings when a bucket is empty or exceeds
the configured imbalance threshold (>85%). This aligns with the user's approved
alert policy.
"""

from typing import Dict, List
import logging

# Use the same logger utilities for consistency
from utils.logger import log_event, log_error

# Imbalance alert thresholds (hard‑coded per user approval)
MAX_BUCKET_PERCENTAGE = 85  # percent

def compute_distribution_metrics(classified_tabs: Dict[str, List[dict]]) -> Dict[str, float]:
    """Calculate bucket percentages.

    Args:
        classified_tabs: Mapping of bucket name to list of row data objects.

    Returns:
        A dict with keys ``integrated``, ``deployment``, ``low_hanging_fruits``
        representing the percentage of rows in each bucket.
    """
    total = sum(len(v) for v in classified_tabs.values()) or 1  # avoid div zero
    integrated = len(classified_tabs.get("complibear_integrated", [])) / total * 100
    deployment = len(classified_tabs.get("ready_for_deployment", [])) / total * 100
    low_hanging = len(classified_tabs.get("low_hanging_fruits", [])) / total * 100

    # Log warnings according to alert policy
    if integrated == 0 or deployment == 0 or low_hanging == 0:
        log_event(
            "DISTRIBUTION_IMBALANCE",
            "SYSTEM",
            {"issue": "bucket_zero", "details": {
                "integrated": integrated,
                "deployment": deployment,
                "low_hanging_fruits": low_hanging,
            }},
        )
    if any(p > MAX_BUCKET_PERCENTAGE for p in (integrated, deployment, low_hanging)):
        log_event(
            "DISTRIBUTION_IMBALANCE",
            "SYSTEM",
            {"issue": "bucket_excessive", "details": {
                "integrated": integrated,
                "deployment": deployment,
                "low_hanging_fruits": low_hanging,
            }},
        )
    return {
        "integrated": round(integrated, 2),
        "deployment": round(deployment, 2),
        "low_hanging_fruits": round(low_hanging, 2),
    }
