import os
import json

STORAGE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "storage"))

class TenantManager:
    """
    Handles tenant isolation, folder structures, and configuration management.
    Ensures Company A data NEVER mixes with Company B.
    """

    def __init__(self):
        # Create root storage directory if it doesn't exist
        os.makedirs(STORAGE_ROOT, exist_ok=True)
        
    def _get_tenant_path(self, tenant_id: str) -> str:
        return os.path.join(STORAGE_ROOT, f"tenant_{tenant_id}")

    def ensure_tenant_sandbox(self, tenant_id: str):
        """
        Ensures the complete isolated folder structure exists for a tenant.
        """
        base_path = self._get_tenant_path(tenant_id)
        
        directories = [
            "uploads",
            "documents",
            "embeddings",
            "analytics"
        ]
        
        for directory in directories:
            os.makedirs(os.path.join(base_path, directory), exist_ok=True)
            
    def get_upload_dir(self, tenant_id: str) -> str:
        """Returns the isolated upload directory for a tenant."""
        self.ensure_tenant_sandbox(tenant_id)
        return os.path.join(self._get_tenant_path(tenant_id), "uploads")
        
    def get_tenant_config(self, tenant_id: str) -> dict:
        """
        Retrieves the company-specific configuration (risk thresholds, terminology).
        In a real app, this would query a database. For now, we mock it via a local JSON or memory.
        """
        config_path = os.path.join(self._get_tenant_path(tenant_id), "tenant_config.json")
        
        if os.path.exists(config_path):
            try:
                with open(config_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
                
        # Default configuration if none exists
        default_config = {
            "risk_threshold": 75,
            "currency": "USD",
            "primary_processes": ["Procurement", "Finance", "IT"]
        }
        
        # Save default for future use
        self.ensure_tenant_sandbox(tenant_id)
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(default_config, f, indent=2)
            
        return default_config
        
    def get_tenant_features(self, tenant_id: str) -> dict:
        """
        Retrieves feature flags (e.g. enabling/disabling Chat or RAG).
        """
        feature_path = os.path.join(self._get_tenant_path(tenant_id), "tenant_features.json")
        if os.path.exists(feature_path):
            try:
                with open(feature_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
                
        default_features = {
            "chatbot_enabled": True,
            "rag_enabled": True,
            "ai_recommendations_enabled": True
        }
        self.ensure_tenant_sandbox(tenant_id)
        with open(feature_path, "w", encoding="utf-8") as f:
            json.dump(default_features, f, indent=2)
        return default_features

# Global Singleton
tenant_manager = TenantManager()
