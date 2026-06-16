import json
import traceback
from flask import jsonify
from utils.logger import log_error
from utils.json_cleaner import clean_json

def safe_jsonify(*args, **kwargs):
    """
    Wraps Flask's jsonify to ensure no invalid numeric structures (NaN, Infinity)
    are sent to the frontend.
    """
    # Emulate jsonify's argument parsing
    if args and kwargs:
        raise TypeError("safe_jsonify() behavior undefined when passed both args and kwargs")
    elif len(args) == 1:
        data = args[0]
    elif args:
        data = args
    else:
        data = kwargs

    try:
        cleaned_data = clean_json(data)
        # Validate that the JSON can be serialized without NaNs
        json.dumps(cleaned_data, allow_nan=False)
        return jsonify(cleaned_data)
    except Exception as e:
        error_info = traceback.format_exc()
        log_error("JSON_SERIALIZATION_FAILED", "SYSTEM", f"Error: {str(e)}\nTraceback: {error_info}")
        return jsonify({
            "success": False,
            "error": "Invalid JSON serialization prevented"
        }), 500
