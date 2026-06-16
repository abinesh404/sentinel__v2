from typing import Any, Dict
import pandas as pd

class DataContextEngine:
    """
    Temporary workflow context memory.
    Maintains session state per tenant (dataframes, metrics, current file).
    Replaces the global spaghetti 'store'.
    """
    def __init__(self):
        # tenant_id -> state dict
        self._memory: Dict[str, Dict[str, Any]] = {}
        
    def _init_tenant(self, tenant_id: str):
        if tenant_id not in self._memory:
            self._memory[tenant_id] = {
                "filename": None,
                "df": None,
                "kpis": {},
                "chart_data": {}
            }

    def set_dataframe(self, tenant_id: str, df: pd.DataFrame, filename: str):
        self._init_tenant(tenant_id)
        self._memory[tenant_id]["df"] = df
        self._memory[tenant_id]["filename"] = filename

    def get_dataframe(self, tenant_id: str) -> pd.DataFrame:
        return self._memory.get(tenant_id, {}).get("df")

    def set_metrics(self, tenant_id: str, kpis: dict, chart_data: dict):
        self._init_tenant(tenant_id)
        self._memory[tenant_id]["kpis"] = kpis
        self._memory[tenant_id]["chart_data"] = chart_data

    def get_metrics(self, tenant_id: str) -> tuple[dict, dict]:
        tenant_mem = self._memory.get(tenant_id, {})
        return tenant_mem.get("kpis", {}), tenant_mem.get("chart_data", {})

    def clear(self, tenant_id: str):
        if tenant_id in self._memory:
            del self._memory[tenant_id]

# Singleton
data_context_engine = DataContextEngine()
