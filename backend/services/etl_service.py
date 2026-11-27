import math
import json
import re
from datetime import date, datetime
import numpy as np
import pandas as pd
from models.database import SessionLocal, Transaction
from services.sarvam_client import generate_response

TARGET_FIELDS = ("date", "amount", "category", "product_sku", "customer_id", "quantity", "remaining")


def clean_json_response(raw_text: str) -> dict:
    """Extracts the mapped column JSON object while rejecting LLM error payloads."""
    try:
        if not raw_text or raw_response_is_error(raw_text):
            return {}
        cleaned = re.sub(r"```(?:json)?\n?", "", raw_text).strip("` \n")
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        parsed = json.loads(match.group(0)) if match else json.loads(cleaned)
        if not isinstance(parsed, dict) or "error" in parsed:
            return {}
        return parsed
    except Exception:
        return {}


def raw_response_is_error(raw_text: str) -> bool:
    prefixes = ("AI key not configured", "AI request failed", "Error processing AI response")
    return raw_text.strip().startswith(prefixes)


def _norm(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", str(name).lower()).strip("_")


def _score_column(col: str, exact_names: tuple, strong_tokens: tuple, weak_tokens: tuple = (), exclude_tokens: tuple = ()) -> int:
    norm = _norm(col)
    if not norm:
        return 0
    tokens = set(norm.split("_"))
    if any(ex in tokens or ex in norm for ex in exclude_tokens):
        return 0
    if norm in exact_names:
        return 100
    if any(st == norm or f"_{st}_" in f"_{norm}_" for st in strong_tokens):
        return 75
    if any(st in norm for st in strong_tokens):
        return 55
    if any(wt in tokens or wt in norm for wt in weak_tokens):
        return 30
    return 0


def _pick_best_column(columns: list, used: set, *score_args, **score_kwargs) -> str | None:
    best_col = None
    best_score = 0
    for col in columns:
        if col in used:
            continue
        score = _score_column(col, *score_args, **score_kwargs)
        if score > best_score:
            best_score = score
            best_col = col
    return best_col


def fallback_heuristic_mapping(columns: list) -> dict:
    """Priority-ranked multilingual column mapper avoiding greedy first-column mistakes."""
    used = set()
    mapping = {field: None for field in TARGET_FIELDS}

    mapping["date"] = _pick_best_column(
        columns, used,
        ("date", "orderdate", "order_date", "transaction_date", "sale_date", "invoice_date", "created_at", "data", "fecha", "datum"),
        ("date", "data", "fecha", "datum", "timestamp"),
        ("time", "day"),
        exclude_tokens=("update", "updated", "candidate", "birth", "expire"),
    )
    if mapping["date"]:
        used.add(mapping["date"])

    # Detect wide multi-period sales columns (e.g., Jan_Sales, Feb_Sales, Mar_Sales)
    amount_scores = [
        (c, _score_column(
            c,
            ("sales", "total_sales", "revenue", "amount", "total_amount", "grand_total", "order_total", "net_sales", "subtotal", "total", "valor", "receita", "ventas", "faturamento"),
            ("sales", "revenue", "amount", "turnover", "receita", "ventas", "faturamento", "valor"),
            ("total", "value", "montant", "umsatz", "price", "preco", "prix", "preis"),
            exclude_tokens=("priceeach", "price_each", "unit_price", "unitprice", "msrp", "cost", "cogs", "qty", "quantity", "discount", "tax", "fee", "id", "count"),
        ))
        for c in columns if c not in used
    ]
    top_amount_score = max((s for _, s in amount_scores), default=0)
    top_amount_cols = [c for c, s in amount_scores if s == top_amount_score and s > 0]
    if top_amount_score == 100 and top_amount_cols:
        mapping["amount"] = top_amount_cols[0]
    elif len(top_amount_cols) == 1:
        mapping["amount"] = top_amount_cols[0]
    # If >= 2 non-exact amount columns tie (wide pivot like Jan_Sales/Feb_Sales/Mar_Sales),
    # leave mapping["amount"] = None so dynamic unpivot (pd.melt) aggregates all periods!
    if not mapping["amount"]:
        # Allow unit price fallback only if there is no quantity column to multiply with,
        # otherwise process_and_load_csv computes revenue = quantity * unit_price.
        has_qty = any(
            _score_column(c, ("quantityordered", "quantity_ordered", "qty_ordered", "units_sold", "sold", "quantity", "qty", "units"), ("quantity", "qty", "sold", "qtd", "cantidad", "units")) > 0
            for c in columns
        )
        if not has_qty:
            mapping["amount"] = _pick_best_column(
                columns, used,
                ("price", "priceeach", "price_each", "unit_price", "preco", "prix", "preis"),
                ("price", "preco", "prix", "preis"),
                (),
                exclude_tokens=("msrp", "cost"),
            )
    if mapping["amount"]:
        used.add(mapping["amount"])

    mapping["category"] = _pick_best_column(
        columns, used,
        ("category", "productline", "product_line", "subcategory", "sub_category", "categoria", "categorie", "kategorie", "department", "dept", "segment"),
        ("category", "productline", "product_line", "categoria", "department", "dept", "segment", "division"),
        ("group", "class", "type", "line"),
        exclude_tokens=("product_sku", "productcode", "product_code", "sku", "id", "orderlinenumber", "addressline"),
    )
    if mapping["category"]:
        used.add(mapping["category"])

    mapping["product_sku"] = _pick_best_column(
        columns, used,
        ("product_sku", "sku", "productcode", "product_code", "item_code", "item_id", "product_id", "stockcode", "productname", "product_name", "item_name"),
        ("sku", "productcode", "product_code", "item_code", "stockcode", "product_name", "item"),
        ("product", "produto", "articulo", "descricao", "description"),
        exclude_tokens=("productline", "product_line", "category"),
    )
    if mapping["product_sku"]:
        used.add(mapping["product_sku"])

    mapping["customer_id"] = _pick_best_column(
        columns, used,
        ("customer_id", "customerid", "customername", "customer_name", "client_id", "buyer_id", "user_id", "customer", "cliente"),
        ("customer", "cliente", "client", "buyer"),
        ("account",),
        exclude_tokens=("contact",),
    )
    if mapping["customer_id"]:
        used.add(mapping["customer_id"])

    mapping["quantity"] = _pick_best_column(
        columns, used,
        ("quantityordered", "quantity_ordered", "qty_ordered", "units_sold", "sold", "quantity", "qty", "units"),
        ("quantity", "qty", "sold", "qtd", "cantidad", "units"),
        (),
        exclude_tokens=("id", "price", "cost", "amount"),
    )
    if mapping["quantity"]:
        used.add(mapping["quantity"])

    mapping["remaining"] = _pick_best_column(
        columns, used,
        ("remaining", "stock_remaining", "stock_on_hand", "on_hand", "inventory", "stock", "estoque"),
        ("remaining", "stock", "inventory", "on_hand", "estoque"),
        (),
        exclude_tokens=("stockcode", "out_of_stock"),
    )
    return mapping


def ask_llm_for_multilingual_mapping(columns: list, sample_rows: list) -> dict:
    heuristics = fallback_heuristic_mapping(columns)
    col_lookup = {str(c): c for c in columns}
    col_lower_lookup = {str(c).strip().lower(): c for c in columns}

    prompt = f"""
You are a multilingual Data Engineering AI.
Analyze the CSV headers and sample data rows below, which may be in ANY language.

CSV Columns: {columns}
Sample Rows: {sanitize_json_value(sample_rows)}

Map the CSV column names to these target database schema fields:
- "date": Date or timestamp column (e.g., date, order_date, ORDERDATE, data, fecha, datum)
- "amount": Total line/order revenue or sales value (prefer total sales/revenue over unit price, e.g., SALES, amount, revenue, preco, valor, total)
- "category": Product category, product line, or department (e.g., category, PRODUCTLINE, categoria, department)
- "product_sku": Product SKU, code, or item identifier (e.g., sku, PRODUCTCODE, product_id, item, product_name)
- "customer_id": Customer ID, buyer identifier, or customer name (e.g., customer_id, CUSTOMERNAME, cliente, buyer)
- "quantity": Units sold/ordered if present (e.g., QUANTITYORDERED, qty, quantity, sold, units)
- "remaining": Remaining stock on hand if present (e.g., remaining, stock, inventory, on_hand)

Return ONLY a raw JSON object with these exact keys: "date", "amount", "category", "product_sku", "customer_id", "quantity", "remaining".
Use the exact original CSV column name as the value, or null if no appropriate column exists.
"""
    try:
        raw_response = generate_response(prompt)
        parsed = clean_json_response(raw_response)
        if parsed:
            validated = {}
            for field in TARGET_FIELDS:
                val = parsed.get(field)
                if isinstance(val, str):
                    if val in col_lookup:
                        validated[field] = col_lookup[val]
                    elif val.strip().lower() in col_lower_lookup:
                        validated[field] = col_lower_lookup[val.strip().lower()]
                    else:
                        validated[field] = heuristics.get(field)
                else:
                    validated[field] = heuristics.get(field)
            if any(validated.values()):
                print(f"[ETL AI Mapping Success]: {validated}")
                return validated
    except Exception:
        pass

    return heuristics


def sanitize_json_value(val):
    """Recursively converts pandas/numpy/NaN/Infinity/datetime values to JSON-safe Python primitives."""
    if val is None:
        return None
    if isinstance(val, dict):
        return {str(k): sanitize_json_value(v) for k, v in val.items()}
    if isinstance(val, (list, tuple)):
        return [sanitize_json_value(v) for v in val]
    if isinstance(val, (bool, np.bool_)):
        return bool(val)
    if isinstance(val, (int, np.integer)):
        return int(val)
    if isinstance(val, (float, np.floating)):
        f = float(val)
        return None if (math.isnan(f) or math.isinf(f)) else f
    if isinstance(val, (pd.Timestamp, datetime, date)):
        return val.isoformat()
    try:
        if pd.isna(val):
            return None
    except Exception:
        pass
    return str(val) if not isinstance(val, str) else val


def parse_numeric(val, default: float = 0.0) -> float:
    if val is None:
        return default
    if isinstance(val, (bool, np.bool_)):
        return default
    if isinstance(val, (int, float, np.integer, np.floating)):
        f = float(val)
        return default if (math.isnan(f) or math.isinf(f)) else f
    s = str(val).strip()
    if not s or s.lower() in {"nan", "none", "null", "n/a", "na", "-"}:
        return default
    is_negative_paren = s.startswith("(") and s.endswith(")")
    clean_val = re.sub(r"[^\d.\-]", "", s)
    if not clean_val or clean_val in {"-", ".", "-."}:
        return default
    try:
        num = float(clean_val)
        if math.isnan(num) or math.isinf(num):
            return default
        return -abs(num) if is_negative_paren else num
    except Exception:
        return default


def normalize_date_series(series: pd.Series, default_date: str) -> list[str]:
    """Normalizes mixed/US/EU date columns to consistent ISO YYYY-MM-DD strings."""
    non_null = series.dropna().astype(str).str.strip()
    if non_null.empty:
        return [default_date] * len(series)

    # Detect whether slash dates are predominantly MM/DD/YYYY (US) vs DD/MM/YYYY (EU)
    dayfirst = False
    slash_samples = non_null[non_null.str.contains(r"^\d{1,2}/\d{1,2}/\d{2,4}", regex=True)].head(100)
    if not slash_samples.empty:
        parts = slash_samples.str.extract(r"^(\d{1,2})/(\d{1,2})/(\d{2,4})").dropna()
        if not parts.empty:
            first_vals = pd.to_numeric(parts[0], errors="coerce").dropna()
            second_vals = pd.to_numeric(parts[1], errors="coerce").dropna()
            has_first_gt_12 = bool((first_vals > 12).any())
            has_second_gt_12 = bool((second_vals > 12).any())
            if has_first_gt_12 and not has_second_gt_12:
                dayfirst = True
            else:
                dayfirst = False
    else:
        dot_samples = non_null[non_null.str.contains(r"^\d{1,2}[.\-]\d{1,2}[.\-]\d{4}", regex=True)].head(50)
        if not dot_samples.empty:
            dayfirst = True

    parsed = pd.to_datetime(series, format="mixed", dayfirst=dayfirst, errors="coerce")
    return [ts.strftime("%Y-%m-%d") if pd.notna(ts) else default_date for ts in parsed]


def read_csv_resilient(file_path: str) -> pd.DataFrame:
    """Reads CSV across encodings (UTF-8-SIG, UTF-8, CP1252, Latin1) and delimiters."""
    encodings = ("utf-8-sig", "utf-8", "cp1252", "latin1")
    last_err = None
    for enc in encodings:
        try:
            df = pd.read_csv(file_path, encoding=enc, on_bad_lines="skip")
            if df.shape[1] == 1:
                first_col = str(df.columns[0])
                if any(delim in first_col for delim in (";", "\t", "|")):
                    df_alt = pd.read_csv(file_path, encoding=enc, sep=None, engine="python", on_bad_lines="skip")
                    if df_alt.shape[1] > 1:
                        df = df_alt
            df = df.dropna(how="all")
            df = df.loc[:, ~df.columns.astype(str).str.match(r"^Unnamed:\s*\d+$")]
            df.columns = [str(c).strip() for c in df.columns]
            if df.empty or df.shape[1] == 0:
                raise ValueError("CSV file contains no readable data rows.")
            return df
        except UnicodeDecodeError as ue:
            last_err = ue
            continue
        except ValueError:
            raise
        except Exception as exc:
            last_err = exc
            continue
    raise ValueError(f"Could not parse CSV file: {last_err}")


def _find_financial_column(columns: list, keywords: tuple, exclude: tuple = ()) -> str | None:
    for col in columns:
        norm = _norm(col)
        tokens = set(norm.split("_"))
        if any(ex in tokens for ex in exclude):
            continue
        if any(kw in tokens or norm == kw or norm.endswith(f"_{kw}") or norm.startswith(f"{kw}_") for kw in keywords):
            return col
    return None


def process_and_load_csv(file_path: str, user_id: int, file_id: int = None):
    db = SessionLocal()
    try:
        df = read_csv_resilient(file_path)
        original_cols = df.columns.tolist()
        sample_rows = df.head(3).to_dict(orient="records")

        ai_mapping = ask_llm_for_multilingual_mapping(original_cols, sample_rows)

        # Fallback: if no total amount column exists (or unit price was mapped alongside quantity),
        # compute line revenue = quantity * unit_price
        amount_norm = _norm(ai_mapping.get("amount") or "")
        is_unit_price_amount = amount_norm in {"price", "priceeach", "price_each", "unit_price", "unitprice", "preco", "prix", "preis"}
        if (not ai_mapping.get("amount") or is_unit_price_amount) and ai_mapping.get("quantity"):
            unit_price_col = ai_mapping.get("amount") if is_unit_price_amount else _pick_best_column(
                original_cols, set(),
                ("priceeach", "price_each", "unit_price", "unitprice", "price", "preco", "prix", "preis"),
                ("price", "preco", "prix", "preis"),
                exclude_tokens=("msrp", "cost"),
            )
            qty_col = ai_mapping.get("quantity")
            if unit_price_col and qty_col:
                qty_num = df[qty_col].apply(lambda v: parse_numeric(v, 0.0))
                price_num = df[unit_price_col].apply(lambda v: parse_numeric(v, 0.0))
                df["__computed_amount"] = qty_num * price_num
                ai_mapping["amount"] = "__computed_amount"

        # --- Self-Healing ETL: Dynamic Unpivot for Wide Formats ---
        if not ai_mapping.get("amount"):
            numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()
            excluded_wide_tokens = (
                "id", "number", "num", "no", "code", "zip", "postal", "phone",
                "year", "month", "qtr", "quarter", "day", "week", "age",
                "qty", "quantity", "count", "units", "lat", "lon", "lng", "msrp",
                "orderline", "linenumber"
            )
            value_vars = [
                c for c in numeric_cols
                if not any(tok in _norm(c) for tok in excluded_wide_tokens)
            ]

            if len(value_vars) > 1:
                id_vars = [c for c in df.columns if c not in value_vars]
                df = pd.melt(
                    df,
                    id_vars=id_vars,
                    value_vars=value_vars,
                    var_name="__melted_category",
                    value_name="__melted_amount",
                )
                ai_mapping["amount"] = "__melted_amount"
                ai_mapping["category"] = "__melted_category"

                if not ai_mapping.get("date"):
                    dates = pd.date_range(end=pd.Timestamp.today(), periods=90)
                    df["__mock_date"] = np.random.choice(dates, len(df))
                    df["__mock_date"] = pd.to_datetime(df["__mock_date"]).dt.strftime("%Y-%m-%d")
                    ai_mapping["date"] = "__mock_date"

        date_col = ai_mapping.get("date")
        amount_col = ai_mapping.get("amount")
        category_col = ai_mapping.get("category")
        sku_col = ai_mapping.get("product_sku")
        customer_col = ai_mapping.get("customer_id")
        quantity_col = ai_mapping.get("quantity")
        remaining_col = ai_mapping.get("remaining")

        default_date = datetime.today().strftime("%Y-%m-%d")
        normalized_dates = (
            normalize_date_series(df[date_col], default_date)
            if date_col and date_col in df.columns
            else [default_date] * len(df)
        )

        # Identify explicit financial cost/profit columns using exact token matching (avoids false positives like 'internet')
        cost_col = _find_financial_column(df.columns.tolist(), ("cost", "cogs", "expense", "expenses", "wholesale"))
        net_col = _find_financial_column(df.columns.tolist(), ("net_profit", "profit", "net_income", "earnings", "earning", "margin"))

        raw_records = df.to_dict(orient="records")
        db_records = []

        for idx, raw_rec in enumerate(raw_records):
            record = sanitize_json_value(raw_rec)
            amount_val = parse_numeric(record.get(amount_col), 0.0) if amount_col else 0.0

            # Normalize cost & net_profit cleanly into raw_data
            if cost_col and record.get(cost_col) is not None:
                cost_num = parse_numeric(record.get(cost_col), None)
                if cost_num is not None:
                    record["cost"] = round(cost_num, 2)
                else:
                    record["cost"] = round(amount_val * 0.65, 2)
            elif "cost" not in record or record.get("cost") is None:
                record["cost"] = round(amount_val * 0.65, 2)

            if net_col and record.get(net_col) is not None:
                net_num = parse_numeric(record.get(net_col), None)
                if net_num is not None:
                    record["net_profit"] = round(net_num, 2)
                else:
                    record["net_profit"] = round(amount_val * 0.15, 2)
            elif "net_profit" not in record or record.get("net_profit") is None:
                record["net_profit"] = round(amount_val * 0.15, 2)

            if quantity_col and quantity_col in record and "sold" not in record:
                qty_val = parse_numeric(record.get(quantity_col), 0.0)
                if qty_val > 0:
                    record["sold"] = int(round(qty_val))

            if remaining_col and remaining_col in record and "remaining" not in record:
                rem_val = parse_numeric(record.get(remaining_col), None)
                if rem_val is not None:
                    record["remaining"] = max(0, int(round(rem_val)))

            cat_val = record.get(category_col) if category_col else None
            sku_val = record.get(sku_col) if sku_col else None
            cust_val = record.get(customer_col) if customer_col else None

            db_records.append({
                "user_id": user_id,
                "file_id": file_id,
                "date": normalized_dates[idx],
                "amount": round(amount_val, 2),
                "category": str(cat_val).strip() if cat_val is not None and str(cat_val).strip() else "Uncategorized",
                "product_sku": str(sku_val).strip() if sku_val is not None and str(sku_val).strip() else "UNKNOWN",
                "customer_id": str(cust_val).strip() if cust_val is not None and str(cust_val).strip() else "1",
                "raw_data": record,
            })

        # Chunk bulk insert to stay well within Render free-tier memory and statement limits
        chunk_size = 1000
        for i in range(0, len(db_records), chunk_size):
            db.bulk_insert_mappings(Transaction, db_records[i : i + chunk_size])

        db.commit()
        return {"status": "Success", "rows_loaded": len(db_records), "detected_mapping": ai_mapping}
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
