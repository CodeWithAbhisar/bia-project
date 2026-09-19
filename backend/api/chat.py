from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

from models.database import get_db, Transaction
from api.auth import get_current_user_id
from services.sarvam_client import generate_response, generate_response_stream

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
    user_id: int = Depends(get_current_user_id)
):
    try:
        transactions = db.query(Transaction).filter(Transaction.user_id == user_id).all()
        
        if not transactions:
            data_context = "No transaction data has been uploaded yet."
        else:
            total_rev = sum(t.amount for t in transactions if t.amount is not None)
            total_rows = len(transactions)
            
            categories = {}
            for t in transactions:
                cat = t.category or "Uncategorized"
                categories[cat] = categories.get(cat, 0) + (t.amount or 0.0)
                
            cat_summary = ", ".join([f"{k}: ${round(v, 2)}" for k, v in categories.items()])

            # --- NEW: Extract and aggregate the raw JSON data! ---
            raw_metrics = {}
            original_columns = []
            
            # Check if there is raw data saved
            if transactions and transactions[0].raw_data:
                original_columns = list(transactions[0].raw_data.keys())
                
                # Loop through every row and add up any numeric columns it finds
                for t in transactions:
                    if t.raw_data:
                        for key, value in t.raw_data.items():
                            if isinstance(value, (int, float)):
                                raw_metrics[key] = raw_metrics.get(key, 0) + value

            raw_summary = ", ".join([f"Total {k}: {round(v, 2)}" for k, v in raw_metrics.items()])
            # -----------------------------------------------------
            from api.inventory import get_inventory
            from services.analytics_engine import get_overview_data, get_cashflow_data
            from api.insights import get_insights

            # 1. Inventory Data
            inv_data = get_inventory(db, user_id)
            inv_summary = ", ".join([f"{item['category']} ({item['status']}): {item['remaining']} left, {item['sold']} sold" for item in inv_data.get('inventory', [])])
            inv_metrics = inv_data.get('metrics', {})

            # 2. Overview KPIs
            overview_data = get_overview_data(db, user_id)
            kpis = overview_data.get('kpis', {})

            # 3. Cashflow and Financial Metrics
            cashflow_data = get_cashflow_data(db, user_id)
            fin_metrics = cashflow_data.get('financial_metrics', {})

            # 4. Automated Insights
            insights_data = get_insights(db, user_id)
            insights_summary = "\n  * ".join([f"{i['title']}: {i['description']}" for i in insights_data.get('insights', [])])
            if insights_summary: insights_summary = "\n  * " + insights_summary

            data_context = (
                f"Current Dataset Summary for User {user_id}:\n"
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

        history_text = "\n".join([f"{msg.role.upper()}: {msg.text}" for msg in request.history[-5:]]) if request.history else "No previous history."

        system_prompt = f"""
You are an executive Business Intelligence assistant. 
Answer user queries strictly based on the following real-time user data context.

{data_context}

Previous Conversation Context (last 5 messages):
{history_text}

User question: {request.message}
"""
        return StreamingResponse(generate_response_stream(system_prompt), media_type="text/event-stream")

    except Exception as e:
        return StreamingResponse(iter([f"An internal server error occurred: {str(e)}"]), media_type="text/event-stream")