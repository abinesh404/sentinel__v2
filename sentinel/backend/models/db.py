from flask_sqlalchemy import SQLAlchemy

# Initialize SQLAlchemy with no settings
# We configure it in app.py to avoid circular dependencies
db = SQLAlchemy()
