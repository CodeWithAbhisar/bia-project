from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
import pandas as pd

from models.database import get_db, Transaction
from api.auth import get_current_user_id # 1. Import the decoder

router = APIRouter()

@router.get("/api/insights")
def get_insights(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    try:
        daily_sales = db.query(
            Transaction.date,
            func.sum(Transaction.amount).label('daily_revenue')
        ).filter(Transaction.user_id == user_id).group_by(Transaction.date).order_by(Transaction.date).all()
        
        cat_sales = db.query(
            Transaction.category,
            func.sum(Transaction.amount).label('cat_revenue')
        ).filter(Transaction.user_id == user_id).group_by(Transaction.category).order_by(func.sum(Transaction.amount).desc()).all()
        
        product_sales = db.query(
            Transaction.product_sku,
            func.sum(Transaction.amount).label('prod_revenue'),
            func.count(Transaction.id).label('prod_sold')
        ).filter(Transaction.user_id == user_id).group_by(Transaction.product_sku).order_by(func.sum(Transaction.amount).desc()).all()
        
        customer_sales = db.query(
            Transaction.customer_id,
            func.sum(Transaction.amount).label('cust_revenue'),
            func.count(Transaction.id).label('cust_orders')
        ).filter(Transaction.user_id == user_id).group_by(Transaction.customer_id).order_by(func.sum(Transaction.amount).desc()).all()
        
        if not daily_sales:
            return {"insights": [{"title": "No Data", "description": "Upload data to see insights.", "type": "info"}]}
        
        df = pd.DataFrame([(row.date, row.daily_revenue) for row in daily_sales], columns=['date', 'revenue'])
        avg_revenue = df['revenue'].mean()
        std_dev = df['revenue'].std() if len(df) > 1 else 0
        
        insights = []
        
        if cat_sales:
            top_category = cat_sales[0]
            insights.append({
                "title": "Top Performing Category",
                "description": f"'{top_category.category}' is driving the most revenue at ${top_category.cat_revenue:,.2f}.",
                "type": "success"
            })
            
            if len(cat_sales) > 1:
                bottom_cat = cat_sales[-1]
                insights.append({
                    "title": "Underperforming Category",
                    "description": f"'{bottom_cat.category}' is your lowest earner (${bottom_cat.cat_revenue:,.2f}). Consider a promotional push or discounting.",
                    "type": "alert"
                })
        
        if product_sales:
            top_product = product_sales[0]
            if top_product.product_sku and str(top_product.product_sku).lower() != 'unknown':
                insights.append({
                    "title": "Bestselling SKU Identified",
                    "description": f"Product '{top_product.product_sku}' generated ${top_product.prod_revenue:,.2f} across {top_product.prod_sold} orders.",
                    "type": "success"
                })
        
        if customer_sales:
            vip = customer_sales[0]
            if vip.customer_id and str(vip.customer_id) != '1':
                total_rev = sum(c.cust_revenue for c in customer_sales)
                pct = (vip.cust_revenue / total_rev) * 100 if total_rev > 0 else 0
                insights.append({
                    "title": "VIP Customer Detected",
                    "description": f"Customer ID #{vip.customer_id} spent ${vip.cust_revenue:,.2f} over {vip.cust_orders} orders (representing {pct:.1f}% of total revenue).",
                    "type": "info"
                })
            
        anomalies = df[df['revenue'] > (avg_revenue + (std_dev * 1.5))]
        if not anomalies.empty:
            best_day = anomalies.iloc[0]
            insights.append({
                "title": "Unusual Sales Spike",
                "description": f"Extremely high volume on {best_day['date']}: ${best_day['revenue']:,.2f} (Your average is ${avg_revenue:,.2f}). Check marketing channels on this day.",
                "type": "success"
            })
        
        volatility = "highly volatile" if std_dev > (avg_revenue * 0.5) else "stable"
        insights.append({
            "title": "Revenue Stability",
            "description": f"Your business averages ${avg_revenue:,.2f} per active day. Your daily sales are generally {volatility}.",
            "type": "info"
        })
        
        return {"insights": insights}
    except Exception as e:
        return {"insights": []}