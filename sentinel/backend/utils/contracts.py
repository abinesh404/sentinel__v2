from typing import Any, Dict, List

class ServiceResponse:
    """
    Standard Data Contract for all engines.
    Prevents tight coupling by enforcing a universal response structure.
    """
    def __init__(self, status: str, data: Any = None, errors: List[str] = None, warnings: List[str] = None):
        self.status = status # 'success' or 'error'
        self.data = data if data is not None else {}
        self.errors = errors if errors is not None else []
        self.warnings = warnings if warnings is not None else []
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status,
            "data": self.data,
            "errors": self.errors,
            "warnings": self.warnings
        }

    @classmethod
    def success(cls, data: Any = None, warnings: List[str] = None):
        return cls(status="success", data=data, warnings=warnings)
        
    @classmethod
    def error(cls, errors: List[str], data: Any = None):
        return cls(status="error", data=data, errors=errors)
