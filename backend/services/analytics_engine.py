from sqlalchemy.orm import Session
from sqlalchemy import func
import pandas as pd
from models.database import Transaction

def get_overview_data(db: Session, user_id: int):
    daily_sales = db.query(
        Transaction.date, 
        func.sum(Transaction.amount).label('daily_revenue')
    ).filter(Transaction.user_id == user_id).group_by(Transaction.date).order_by(Transaction.date).all()
    
    df = pd.DataFrame([(row.date, row.daily_revenue) for row in daily_sales], columns=['date', 'revenue'])
    
    total_rev = 0.0
    clv = 0.0
    mom_growth = 0.0
    top_region = None
    revenue_trend = []

    if not df.empty:
        # Flexible parser to handle mixed date formats (e.g., DD/MM/YYYY or YYYY-MM-DD)
        df['date'] = pd.to_datetime(df['date'], format='mixed', dayfirst=True)
        
        # Sort chronologically so the line chart renders smoothly left-to-right
        df = df.sort_values(by='date')
        
        total_rev = float(df['revenue'].sum())
        
        unique_customers = 1
        if hasattr(Transaction, 'customer_id'):
            unique_customers = db.query(func.count(func.distinct(Transaction.customer_id))).filter(Transaction.user_id == user_id).scalar() or 1
            
        clv = float(total_rev / unique_customers)
        
        max_date = df['date'].max()
        current_month_start = max_date - pd.Timedelta(days=30)
        prev_month_start = current_month_start - pd.Timedelta(days=30)
        
        current_rev = float(df[df['date'] > current_month_start]['revenue'].sum())
        prev_rev = float(df[(df['date'] > prev_month_start) & (df['date'] <= current_month_start)]['revenue'].sum())
        
        if prev_rev > 0:
            mom_growth = float(((current_rev - prev_rev) / prev_rev) * 100)
        elif current_rev > 0:
            mom_growth = 100.0 

        if hasattr(Transaction, 'region'):
            region_query = db.query(Transaction.region, func.sum(Transaction.amount).label('rev')).filter(Transaction.user_id == user_id).group_by(Transaction.region).order_by(func.sum(Transaction.amount).desc()).first()
            if region_query:
                top_region = region_query.region
            
        df['date_str'] = df['date'].dt.strftime('%Y-%m-%d')
        revenue_trend = [{"date": row['date_str'], "revenue": round(float(row['revenue']), 2)} for _, row in df.iterrows()]

    return {
        "kpis": {
            "total_revenue": round(total_rev, 2),
            "clv": round(clv, 2),
            "mom_growth": round(mom_growth, 2),
            "top_region": top_region
        },
        "revenue_trend": revenue_trend
    }

def get_cashflow_data(db: Session, user_id: int):
    daily_sales = db.query(
        Transaction.date, 
        func.sum(Transaction.amount).label('daily_revenue')
    ).filter(Transaction.user_id == user_id).group_by(Transaction.date).order_by(Transaction.date).all()
    
    total_rev = sum(row.daily_revenue for row in daily_sales) if daily_sales else 0.0

    gross_margin = None
    net_margin = None
    operating_cash_flow = total_rev
    burn_rate = 0.0
    break_even = 0.0
    expense_ratio = None
    roi = None

    total_cost = 0.0
    total_net = 0.0
    has_cost = False
    has_net = False
    
    # Extract dynamic metrics from raw JSON data
    raw_txs = db.query(Transaction.raw_data).filter(Transaction.user_id == user_id).all()
    for (raw_json,) in raw_txs:
        if raw_json:
            if 'cost' in raw_json:
                has_cost = True
                try:
                    total_cost += float(raw_json['cost'])
                except:
                    pass
            if 'net_profit' in raw_json:
                has_net = True
                try:
                    total_net += float(raw_json['net_profit'])
                except:
                    pass

    if has_cost and total_rev > 0:
        gross_margin = round(((total_rev - total_cost) / total_rev) * 100, 2)
        expense_ratio = round((total_cost / total_rev) * 100, 2)
        if total_cost > 0:
            roi = round(((total_rev - total_cost) / total_cost) * 100, 2)

    if has_net and total_rev > 0:
        net_margin = round((total_net / total_rev) * 100, 2)

    if has_cost and daily_sales:
        from datetime import datetime
        try:
            first_date = datetime.strptime(str(daily_sales[0].date), "%Y-%m-%d")
            last_date = datetime.strptime(str(daily_sales[-1].date), "%Y-%m-%d")
            days_diff = (last_date - first_date).days
            
            if days_diff >= 30:
                months = days_diff / 30.44
                burn_rate = round(total_cost / months, 2)
            elif days_diff > 0:
                burn_rate = round((total_cost / days_diff) * 30.44, 2)
            else:
                burn_rate = round(total_cost * 30.44, 2)
        except Exception:
            burn_rate = round(total_cost, 2)

    return {
        "cashflow": [{"date": str(row.date), "amount": round(float(row.daily_revenue), 2)} for row in daily_sales],
        "financial_metrics": {
            "gross_margin": gross_margin,
            "net_margin": net_margin,
            "operating_cash_flow": round(operating_cash_flow, 2),
            "burn_rate": burn_rate,
            "break_even": break_even,
            "expense_ratio": expense_ratio,
            "roi": roi
        }
    }