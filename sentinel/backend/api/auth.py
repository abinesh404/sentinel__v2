from flask import Blueprint, request
from utils.safe_json_response import safe_jsonify as jsonify
from models.db import db
from utils.logger import log_event

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/api/auth/mock-login", methods=["POST"])
def mock_login():
    """
    Simulates a login. 
    If the default company doesn't exist in the database, it creates it.
    """
    company_name = request.json.get("company_name", "Acme Corp")
    user_email = request.json.get("email", "auditor@acmecorp.com")
    user_name = request.json.get("name", "Alice Auditor")
    

        