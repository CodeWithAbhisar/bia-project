from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from models.database import get_db, Transaction
from api.auth import get_current_user_id

router = APIRouter()

@router.get("/api/inventory")
def get_inventory(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    try:
        sales_by_category = db.query(
            Transaction.category,
            func.count(Transaction.category).label('sold_count'),
            func.sum(Transaction.amount).label('total_rev')
        ).filter(Transaction.user_id == user_id).group_by(Transaction.category).all()
        
        inventory_list = []
        total_stock_value = 0.0
        total_units_sold = 0
        total_inventory_items = 0

        # Extract raw data to check for real inventory metrics
        raw_txs = db.query(Transaction.category, Transaction.date, Transaction.raw_data).filter(Transaction.user_id == user_id).order_by(Transaction.date).all()
        
        category_stats = {}
        for row in sales_by_category:
            category_stats[row.category] = {
                'sold_count': row.sold_count, # Default row count
                'total_rev': row.total_rev,
                'real_sold': 0,
                'real_remaining': 0,
                'has_real_inventory': False,
                'latest_date': None
            }
            
        for cat, tx_date, raw_json in raw_txs:
            if raw_json and cat in category_stats:
                if 'sold' in raw_json:
                    category_stats[cat]['has_real_inventory'] = True
                    category_stats[cat]['real_sold'] += int(raw_json['sold'])
                if 'remaining' in raw_json:
                    # Inventory remaining is a snapshot, not a cumulative sum.
                    # We take the value from the latest date.
                    if category_stats[cat]['latest_date'] is None or tx_date >= category_stats[cat]['latest_date']:
                        category_stats[cat]['real_remaining'] = int(raw_json['remaining'])
                        category_stats[cat]['latest_date'] = tx_date

        for row in sales_by_category:
            cat = row.category
            stats = category_stats[cat]
            
            if stats['has_real_inventory']:
                sold = stats['real_sold']
                stock_remaining = stats['real_remaining']
                starting_stock = sold + stock_remaining
            else:
                starting_stock = 500
                sold = stats['sold_count']
                stock_remaining = max(0, starting_stock - sold)

            total_units_sold += sold
            total_inventory_items += stock_remaining
            
            # Safe estimations for advanced inventory metrics
            avg_price = (stats['total_rev'] / sold) if sold > 0 else 0.0
            category_stock_val = stock_remaining * avg_price
            total_stock_value += category_stock_val
            
            sell_through_rate = round((sold / starting_stock) * 100, 1) if starting_stock > 0 else 0.0
            dio = round((stock_remaining / (sold / 30)), 1) if sold > 0 else 0  # Days Inventory Outstanding proxy
            
            if stock_remaining <= 0:
                status = "Out of Stock"
            elif stock_remaining < 50:
                status = "Low Stock"
            else:
                status = "In Stock"
                
            inventory_list.append({
                "category": cat or "Uncategorized",
                "sold": sold,
                "remaining": stock_remaining,
                "stock_value": round(category_stock_val, 2),
                "sell_through_rate": sell_through_rate,
                "dio": dio,
                "status": status
            })
            
        # Aggregate portfolio calculations
        stockout_rate = round(sum(1 for item in inventory_list if item['status'] == 'Out of Stock') / len(inventory_list) * 100, 1) if inventory_list else 0.0
        stock_turnover_ratio = round(total_units_sold / total_inventory_items, 2) if total_inventory_items > 0 else 0.0
        carrying_cost = round(total_stock_value * 0.12, 2)  # Standard 12% annual carrying cost assumption

        return {
            "inventory": inventory_list,
            "metrics": {
                "total_stock_value": round(total_stock_value, 2),
                "stock_turnover_ratio": stock_turnover_ratio,
                "stockout_rate": stockout_rate,
                "carrying_cost": carrying_cost
            }
        }
    except Exception as e:
        return {
            "inventory": [],
            "metrics": {
                "total_stock_value": 0.0,
                "stock_turnover_ratio": 0.0,
                "stockout_rate": 0.0,
                "carrying_cost": 0.0
            }
        }