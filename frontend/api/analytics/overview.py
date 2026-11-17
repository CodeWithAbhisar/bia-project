import json, os
from urllib.parse import parse_qs

# Import the analytic functions from the existing backend service
from backend.services.analytics_engine import get_overview_data, get_cashflow_data
from ..lib.database import SessionLocal

def handler(event, context):
    """Vercel function to provide BI analytics data.
    Expects a query string with `user_id` (int) and optional `type` (`overview` or `cashflow`).
    """
    try:
        # Extract query parameters
        query = event.get('queryStringParameters') or {}
        # Vercel may provide raw query string; fallback parsing
        if isinstance(query, str):
            query = parse_qs(query)
        user_id = int(query.get('user_id')[0] if isinstance(query.get('user_id'), list) else query.get('user_id'))
        data_type = query.get('type', 'overview')
        db = SessionLocal()
        try:
            if data_type == 'cashflow':
                result = get_cashflow_data(db, user_id)
            else:
                result = get_overview_data(db, user_id)
            return {
                "statusCode": 200,
                "body": json.dumps(result),
                "headers": {"Content-Type": "application/json"},
            }
        finally:
            db.close()
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)}),
            "headers": {"Content-Type": "application/json"},
        }
