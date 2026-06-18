import os
from flask import Flask
from flask_cors import CORS
from api.upload import upload_bp
from api.dashboard import dashboard_bp
from api.auth import auth_bp
from api.audit_template import audit_template_bp
from models.db import db


app = Flask(__name__)
CORS(app)

# ── DATABASE CONFIGURATION ──
# Using SQLite for local development
db_path = os.path.join(os.path.dirname(__file__), 'app.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    # Automatically create tables if they don't exist
    db.create_all()

# Register Blueprints
app.register_blueprint(upload_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(audit_template_bp)

@app.route("/")
def index():
    return "<h3>Sentinel Audit AI Backend is running!</h3><p>Please open the frontend application in your browser at: <a href='http://localhost:4002'>http://localhost:4002</a></p>"

if __name__ == "__main__":
    print("Sentinel Audit AI - Flask Backend starting on http://localhost:4000")
    app.run(debug=True, port=4000, host="0.0.0.0")

