import os
from flask import Blueprint, request, send_file
from utils.safe_json_response import safe_jsonify as jsonify
from engines.template_engine import generate_presentation

audit_template_bp = Blueprint('audit_template', __name__)

@audit_template_bp.route('/api/generate-audit-presentation', methods=['POST'])
def generate_audit_presentation():
    data = request.json
    if not data:
        return jsonify({"error": "No payload provided"}), 400

    try:
        # Call the template engine
        file_path = generate_presentation(data)
        
        # Determine the filename from the path
        filename = os.path.basename(file_path)
        
        # Send the generated file back to the client
        return send_file(
            file_path,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.presentationml.presentation'
        )
    except ValueError as ve:
        print(f"Validation Error: {str(ve)}")
        return jsonify({"error": "Validation Error", "details": str(ve)}), 400
    except Exception as e:
        print(f"Error generating presentation: {str(e)}")
        return jsonify({"error": "Failed to generate presentation", "details": str(e)}), 500
