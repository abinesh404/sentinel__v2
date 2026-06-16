import logging
from datetime import datetime

# Configure base logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(levelname)s] - %(message)s'
)
_logger = logging.getLogger("SentinelAI")

def log_event(event_name: str, tenant_id: str = "SYSTEM", details: dict = None):
    """
    Standardized Observability Logger.
    Example: log_event("UPLOAD_STARTED", "tenant_001", {"filename": "RCM.xlsx"})
    """
    details_str = str(details) if details else "{}"
    _logger.info(f"[{event_name}] Tenant: {tenant_id} | Details: {details_str}")

def log_error(event_name: str, tenant_id: str = "SYSTEM", error_msg: str = ""):
    """
    Standardized Error Logger.
    """
    _logger.error(f"[{event_name}_FAILED] Tenant: {tenant_id} | Error: {error_msg}")
