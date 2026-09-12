import pandas as pd
import json
import re
from datetime import datetime
from sqlalchemy.orm import Session
from models.database import SessionLocal, Transaction

# Explicitly matching the function name
from services.sarvam_client import generate_response 

def clean_json_response(raw_text: str) -> dict:
    try:
        if not raw_text: return {}
        cleaned = re.sub(r'```(?:json)?\n?', '', raw_text).strip('` \n')
        match = re.search(r'\{.*\}', cleaned, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return json.loads(cleaned)
    except Exception as e:
        return {}

def fallback_heuristic_mapping(columns: list) -> dict:
    mapping = {"date": None, "amount": None, "category": None, "product_sku": None, "customer_id": None}
    date_keywords = ['date', 'data', 'fecha', 'datum', 'time']
    amount_keywords = ['amount', 'price', 'total', 'sales', 'revenue', 'valor', 'preco']
    cat_keywords = ['category', 'type', 'dept', 'department', 'categoria']
    sku_keywords = ['sku', 'product', 'item', 'name']
    cust_keywords = ['customer', 'client', 'user', 'buyer']
    
    for col in columns:
        col_lower = str(col).lower()
        if not mapping['date'] and any(k in col_lower for k in date_keywords): mapping['date'] = col
        elif not mapping['amount'] and any(k in col_lower for k in amount_keywords): mapping['amount'] = col
        elif not mapping['category'] and any(k in col_lower for k in cat_keywords): mapping['category'] = col
        elif not mapping['product_sku'] and any(k in col_lower for k in sku_keywords): mapping['product_sku'] = col
        elif not mapping['customer_id'] and any(k in col_lower for k in cust_keywords): mapping['customer_id'] = col
        
    return mapping

def ask_llm_for_multilingual_mapping(columns: list, sample_rows: list) -> dict:
    prompt = f"""
You are a multilingual Data Engineering AI. 
Analyze the CSV headers and sample data rows below, which may be in ANY language (English, Portuguese, Spanish, French, German, Hindi, etc.).

CSV Columns: {columns}
Sample Rows: {sample_rows}

Map the CSV column names to these target database schema fields:
- "date": Date or timestamp column (e.g., date, data, fecha, datum, order_date)
- "amount": Revenue, price, or transaction value (e.g., amount, preco, valor, prix, total, sales)
- "category": Product category, department, or item type (e.g., category, categoria, department, type)
- "product_sku": Product name, SKU, or item ID (e.g., sku, item, product, descricao)
- "customer_id": Customer ID, buyer identifier, or client code (e.g., customer, cliente, buyer, user_id)

Return ONLY a raw JSON object with these exact keys: "date", "amount", "category", "product_sku", "customer_id".
Use the exact original CSV column name as the value, or null if no appropriate column exists.

Example output:
{{"date": "data", "amount": "preco", "category": null, "product_sku": null, "customer_id": null}}
"""
    try:
        raw_response = generate_response(prompt)
        mapping = clean_json_response(raw_response)
        if isinstance(mapping, dict) and any(mapping.values()):
            print(f"[ETL AI Mapping Success]: {mapping}")
            return mapping
    except Exception:
        pass
    
    return fallback_heuristic_mapping(columns)

def process_and_load_csv(file_path: str, user_id: int, file_id: int = None):
    db = SessionLocal()
    try:
        try:
            df = pd.read_csv(file_path, encoding='utf-8')
        except UnicodeDecodeError:
            df = pd.read_csv(file_path, encoding='latin1')
            
        df = df.where(pd.notnull(df), None)
        raw_records = df.to_dict(orient='records')
        
        original_cols = df.columns.tolist()
        sample_rows = df.head(3).to_dict(orient='records')

        ai_mapping = ask_llm_for_multilingual_mapping(original_cols, sample_rows)

        # --- Self-Healing ETL: Dynamic Unpivot for Wide Formats ---
        if not ai_mapping.get('amount'):
            import numpy as np
            numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
            # Filter out obvious ID or categorical columns that happen to be numeric
            value_vars = [c for c in numeric_cols if not any(x in str(c).lower() for x in ['id', 'region', 'channel', 'year', 'zip', 'code'])]
            
            if len(value_vars) > 1:
                id_vars = [c for c in df.columns if c not in value_vars]
                
                # Unpivot!
                df = pd.melt(df, id_vars=id_vars, value_vars=value_vars, var_name='__melted_category', value_name='__melted_amount')
                
                ai_mapping['amount'] = '__melted_amount'
                ai_mapping['category'] = '__melted_category'
                
                # Generate realistic rolling dates for mock time-series if missing
                if not ai_mapping.get('date'):
                    dates = pd.date_range(end=pd.Timestamp.today(), periods=90)
                    df['__mock_date'] = np.random.choice(dates, len(df))
                    df['__mock_date'] = df['__mock_date'].dt.strftime('%Y-%m-%d')
                    ai_mapping['date'] = '__mock_date'

                # Refresh dataframe state for the insertion loop
                df = df.where(pd.notnull(df), None)
                raw_records = df.to_dict(orient='records')
        # -----------------------------------------------------------

        date_col = ai_mapping.get('date')
        amount_col = ai_mapping.get('amount')
        category_col = ai_mapping.get('category')
        sku_col = ai_mapping.get('product_sku')
        customer_col = ai_mapping.get('customer_id')

        def parse_amount(val):
            if val is None: return 0.0
            try:
                clean_val = re.sub(r'[^\d.-]', '', str(val))
                return float(clean_val) if clean_val else 0.0
            except:
                return 0.0

        transactions = []
        for index, row in df.iterrows():
            transaction = Transaction(
                user_id=user_id,
                file_id=file_id,
                date=str(row[date_col]) if date_col and row.get(date_col) is not None else datetime.today().strftime('%Y-%m-%d'),
                amount=parse_amount(row.get(amount_col)) if amount_col else 0.0,
                category=str(row[category_col]) if category_col and row.get(category_col) is not None else 'Uncategorized',
                product_sku=str(row[sku_col]) if sku_col and row.get(sku_col) is not None else 'UNKNOWN',
                customer_id=str(row[customer_col]) if customer_col and row.get(customer_col) is not None else '1',
                raw_data=raw_records[index]
            )
            transactions.append(transaction)
            
        db.bulk_save_objects(transactions)
        
        db.commit()
        return {"status": "Success", "rows_loaded": len(df), "detected_mapping": ai_mapping}
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()