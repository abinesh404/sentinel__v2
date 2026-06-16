"""Application configuration settings for CompliBear backend.

This file centralizes tunable parameters such as classification thresholds
and ERP keyword filters. Temporary values approved by the user are
provided here. They can be updated without code changes.
"""

# Classification thresholds (temporary approved values)
INTEGRATED_THRESHOLD = 0.78  # Integrated bucket if final_similarity >= this
DEPLOYMENT_MIN = 0.60
DEPLOYMENT_MAX = 0.78
LOW_HANGING_MAX = 0.60  # Low hanging if final_similarity < this

# ERP keyword list approved by the user
VALID_ERP_KEYWORDS = [
    "sap", "oracle", "erp", "workflow", "api", "integration",
    "system-generated", "system generated", "rpa", "automation", "bot",
    "servicenow", "dynamics", "netsuite", "automated approval"
]

RECURRING_FREQUENCIES = [
    "daily", "weekly", "monthly", "quarterly", "continuous", "regular", "periodic"
]

def contains_erp_keyword(text: str) -> bool:
    """Return True if any approved ERP keyword is found in the given text.
    Simple case‑insensitive containment check.
    """
    lowered = text.lower()
    return any(keyword in lowered for keyword in VALID_ERP_KEYWORDS)

def is_recurring_frequency(text: str) -> bool:
    """Return True if frequency suggests automated or regular interval."""
    lowered = text.lower()
    return any(freq in lowered for freq in RECURRING_FREQUENCIES)
