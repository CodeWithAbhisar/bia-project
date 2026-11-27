from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional

from models.database import get_db, Transaction, FileRecord, IntegrationSetting, User
from api.auth import get_current_user_id
from services.sarvam_client import generate_response_stream

router = APIRouter()


class ChatMessage(BaseModel):
    role: str
    text: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []


@router.post("/api/chat")
def chat_with_assistant(
    request: ChatRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    try:
        file_count = db.query(FileRecord).filter(
            FileRecord.user_id == user_id,
            FileRecord.status == "completed",
        ).count()
        connected_count = db.query(IntegrationSetting).filter(
            IntegrationSetting.user_id == user_id,
            IntegrationSetting.is_connected == 1,
        ).count()

        total_rows = 0
        if file_count > 0 or connected_count > 0:
            total_rows = db.query(func.count(Transaction.id)).filter(Transaction.user_id == user_id).scalar() or 0

        if total_rows == 0:
            data_context = "No transaction data has been uploaded yet."
        else:
            cat_rows = (
                db.query(Transaction.category, func.sum(Transaction.amount).label("cat_rev"))
                .filter(Transaction.user_id == user_id)
                .group_by(Transaction.category)
                .all()
            )
            cat_summary = ", ".join([
                f"{row.category or 'Uncategorized'}: ${round(float(row.cat_rev or 0.0), 2)}"
                for row in cat_rows
            ])

            # Probe first row schema without loading all ORM rows into RAM
            first_tx = db.query(Transaction.raw_data).filter(Transaction.user_id == user_id).first()
            original_columns = list(first_tx[0].keys()) if first_tx and isinstance(first_tx[0], dict) else []

            # Stream raw_data metrics in constant O(1) memory even for 500k+ row datasets
            raw_metrics = {}
            raw_stream = (
                db.query(Transaction.raw_data)
                .filter(Transaction.user_id == user_id)
                .execution_options(stream_results=True)
                .yield_per(2000)
            )
            for (raw_json,) in raw_stream:
                if isinstance(raw_json, dict):
                    for key, value in raw_json.items():
                        if isinstance(value, (int, float)) and not isinstance(value, bool):
                            raw_metrics[key] = raw_metrics.get(key, 0.0) + float(value)

            raw_summary = ", ".join([f"Total {k}: {round(v, 2)}" for k, v in raw_metrics.items()])

            from api.inventory import get_inventory
            from services.analytics_engine import get_overview_data, get_cashflow_data
            from api.insights import get_insights

            inv_data = get_inventory(db, user_id)
            inv_summary = ", ".join([
                f"{item['category']} ({item['status']}): {item['remaining']} left, {item['sold']} sold"
                for item in inv_data.get("inventory", [])
            ])
            inv_metrics = inv_data.get("metrics", {})

            overview_data = get_overview_data(db, user_id)
            kpis = overview_data.get("kpis", {})

            cashflow_data = get_cashflow_data(db, user_id)
            fin_metrics = cashflow_data.get("financial_metrics", {})

            insights_data = get_insights(db, user_id)
            insights_summary = "\n  * ".join([
                f"{i['title']}: {i['description']}"
                for i in insights_data.get("insights", [])
            ])
            if insights_summary:
                insights_summary = "\n  * " + insights_summary

            user_profile = db.query(User).filter(User.id == user_id).first()
            if user_profile:
                if user_profile.full_name and user_profile.company:
                    user_display = f"{user_profile.full_name} from {user_profile.company}"
                elif user_profile.full_name:
                    user_display = user_profile.full_name
                else:
                    user_display = f"User {user_id}"
            else:
                user_display = "the user"

            data_context = (
                f"Current Dataset Summary for {user_display}:\n"
                f"- Total Records (Units): {total_rows}\n"
                f"- Revenue by Category: {cat_summary}\n"
                f"- Original CSV Columns: {', '.join(original_columns)}\n"
                f"- Raw Data Totals: {raw_summary}\n\n"
                f"[FINANCIAL KPIs]\n"
                f"- Total Revenue: ${kpis.get('total_revenue', 0)}\n"
                f"- Customer Lifetime Value (CLV): ${kpis.get('clv', 0)}\n"
                f"- Month-over-Month Growth: {kpis.get('mom_growth', 0)}%\n"
                f"- Top Region: {kpis.get('top_region', 'N/A')}\n"
                f"- Gross Margin: {fin_metrics.get('gross_margin') or 'N/A'}%\n"
                f"- Net Margin: {fin_metrics.get('net_margin') or 'N/A'}%\n"
                f"- Operating Cash Flow: ${fin_metrics.get('operating_cash_flow', 0)}\n"
                f"- Burn Rate: ${fin_metrics.get('burn_rate', 0)}/month\n\n"
                f"[INVENTORY METRICS]\n"
                f"- Total Stock Value: ${inv_metrics.get('total_stock_value', 0)}\n"
                f"- Stock Turnover Ratio: {inv_metrics.get('stock_turnover_ratio', 0)}\n"
                f"- Stockout Rate: {inv_metrics.get('stockout_rate', 0)}%\n"
                f"- Estimated Carrying Cost: ${inv_metrics.get('carrying_cost', 0)}\n"
                f"- Category Breakdown: {inv_summary}\n\n"
                f"[AUTOMATED INSIGHTS]{insights_summary}\n"
            )

        try:
            from services.vector_service import search_documents
            doc_context = search_documents(request.message, user_id)
            if doc_context:
                data_context += "\n" + doc_context
        except Exception:
            pass

        history_text = "\n".join([f"{msg.role.upper()}: {msg.text}" for msg in request.history[-5:]]) if request.history else "No previous history."

        system_prompt = f"""You are BIA, an autonomous All-Rounder AI Business Agent and Executive Operating Partner.
Your mission is to help the business owner with everything across their business: revenue growth, pricing strategies, cashflow management, inventory optimization, marketing, customer retention, operational cost cutting, and strategic decision making.

Core Capabilities:
1. Live Business Intelligence: Ground all answers directly in the real-time business context provided below (actual sales, revenue, top products, inventory, customer metrics).
2. All-Rounder Business Advisory: When the user asks general or strategic questions (e.g. how to market, how to price, how to handle supplier negotiations, how to scale operations, customer service improvements), provide world-class, structured, actionable advice tailored for small-to-medium businesses.
3. Proactive Insights: Highlight hidden opportunities to boost profits, warn of impending stockouts or margin compression, and propose concrete next steps.
4. Tone: Encouraging, sharp, highly professional, direct, and free of useless jargon.

Real-Time Business Data Context:
{data_context}

Previous Conversation Context (last 5 messages):
{history_text}

Business Owner Query: {request.message}
"""
        return StreamingResponse(generate_response_stream(system_prompt), media_type="text/event-stream")

    except Exception as e:
        return StreamingResponse(iter([f"An internal server error occurred: {str(e)}"]), media_type="text/event-stream")
