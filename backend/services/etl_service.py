import math
import json
import re
from datetime import date, datetime
import numpy as np
import pandas as pd
import models.database as db_mod
from models.database import FileRecord, Transaction
from services.sarvam_client import generate_response

TARGET_FIELDS = ("date", "amount", "category", "product_sku", "customer_id", "quantity", "remaining")
CSV_CHUNK_SIZE = 10000
RAW_DATA_ROW_LIMIT = 5000  # Store per-row JSON on first 5k rows; larger 100k-1M+ files use fast scalar columns


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

    if not mapping["amount"]:
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
- "date": Date or timestamp column
- "amount": Total line/order revenue or sales value (prefer total sales/revenue over unit price)
- "category": Product category, product line, or department
- "product_sku": Product SKU, code, or item identifier
- "customer_id": Customer ID, buyer identifier, or customer name
- "quantity": Units sold/ordered if present
- "remaining": Remaining stock on hand if present

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
        sanitized = {}
        for k, v in val.items():
            clean_v = sanitize_json_value(v)
            if clean_v is not None:
                sanitized[str(k)] = clean_v
        return sanitized
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
    return str(val).replace("\x00", "") if not isinstance(val, str) else val.replace("\x00", "")


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


def _series_to_float(series: pd.Series, default: float = 0.0) -> pd.Series:
    """Fast vectorized string/currency to float parser across an entire chunk Series."""
    if pd.api.types.is_numeric_dtype(series):
        out = pd.to_numeric(series, errors="coerce").replace([np.inf, -np.inf], np.nan)
        return out.fillna(default).astype(float)
    s = series.astype(str).str.strip()
    is_paren = s.str.startswith("(") & s.str.endswith(")")
    cleaned = s.str.replace(r"[^\d.\-]", "", regex=True)
    nums = pd.to_numeric(cleaned, errors="coerce").replace([np.inf, -np.inf], np.nan)
    nums = nums.where(~is_paren, -nums.abs())
    return nums.fillna(default).astype(float)


def detect_dayfirst(series: pd.Series) -> bool:
    """Detects DD/MM vs MM/DD convention once from sample rows for consistent chunk parsing."""
    non_null = series.dropna().astype(str).str.strip()
    if non_null.empty:
        return False
    slash_samples = non_null[non_null.str.contains(r"^\d{1,2}/\d{1,2}/\d{2,4}", regex=True)].head(100)
    if not slash_samples.empty:
        parts = slash_samples.str.extract(r"^(\d{1,2})/(\d{1,2})/(\d{2,4})").dropna()
        if not parts.empty:
            first_vals = pd.to_numeric(parts[0], errors="coerce").dropna()
            second_vals = pd.to_numeric(parts[1], errors="coerce").dropna()
            has_first_gt_12 = bool((first_vals > 12).any())
            has_second_gt_12 = bool((second_vals > 12).any())
            return has_first_gt_12 and not has_second_gt_12
    dot_samples = non_null[non_null.str.contains(r"^\d{1,2}[.\-]\d{1,2}[.\-]\d{4}", regex=True)].head(50)
    return not dot_samples.empty


def normalize_date_series(series: pd.Series, default_date: str, dayfirst: bool | None = None) -> list[str]:
    """Fast vectorized normalization of mixed/US/EU dates to ISO YYYY-MM-DD strings."""
    if dayfirst is None:
        dayfirst = detect_dayfirst(series)
    parsed = pd.to_datetime(series, format="mixed", dayfirst=dayfirst, errors="coerce")
    return parsed.dt.strftime("%Y-%m-%d").fillna(default_date).tolist()


def detect_csv_config(file_path: str) -> tuple[str, str, list[str], pd.DataFrame]:
    """Probes ONLY the first 100 rows to detect encoding, delimiter, and column headers."""
    encodings = ("utf-8-sig", "utf-8", "cp1252", "latin1")
    last_err = None
    for enc in encodings:
        try:
            sep = ","
            df = pd.read_csv(file_path, encoding=enc, nrows=100, on_bad_lines="skip")
            if df.shape[1] == 1:
                first_col = str(df.columns[0])
                for candidate_sep in (";", "\t", "|"):
                    if candidate_sep in first_col:
                        df_alt = pd.read_csv(file_path, encoding=enc, sep=candidate_sep, nrows=100, on_bad_lines="skip")
                        if df_alt.shape[1] > 1:
                            df = df_alt
                            sep = candidate_sep
                            break
            df = df.dropna(how="all")
            df = df.loc[:, ~df.columns.astype(str).str.match(r"^Unnamed:\s*\d+$")]
            df.columns = [str(c).strip() for c in df.columns]
            if df.empty or df.shape[1] == 0:
                raise ValueError("CSV file contains no readable data rows.")
            return enc, sep, df.columns.tolist(), df
        except UnicodeDecodeError as ue:
            last_err = ue
            continue
        except ValueError:
            raise
        except Exception as exc:
            last_err = exc
            continue
    raise ValueError(f"Could not parse CSV file: {last_err}")


def read_csv_resilient(file_path: str) -> pd.DataFrame:
    enc, sep, _, _ = detect_csv_config(file_path)
    df = pd.read_csv(file_path, encoding=enc, sep=sep, on_bad_lines="skip")
    df = df.dropna(how="all")
    df = df.loc[:, ~df.columns.astype(str).str.match(r"^Unnamed:\s*\d+$")]
    df.columns = [str(c).strip() for c in df.columns]
    return df


def _find_financial_column(columns: list, keywords: tuple, exclude: tuple = ()) -> str | None:
    for col in columns:
        norm = _norm(col)
        tokens = set(norm.split("_"))
        if any(ex in tokens for ex in exclude):
            continue
        if any(kw in tokens or norm == kw or norm.endswith(f"_{kw}") or norm.startswith(f"{kw}_") for kw in keywords):
            return col
    return None


def _clean_chunk(chunk: pd.DataFrame, valid_cols: list[str]) -> pd.DataFrame:
    chunk = chunk.dropna(how="all")
    chunk.columns = [str(c).strip() for c in chunk.columns]
    keep_cols = [c for c in valid_cols if c in chunk.columns]
    return chunk[keep_cols] if keep_cols else chunk


def _normalize_text_col(series: pd.Series, fallback: str) -> list[str]:
    s = series.where(pd.notna(series), None)
    out = []
    for v in s.tolist():
        if v is None:
            out.append(fallback)
        else:
            sv = str(v).replace("\x00", "").strip()
            out.append(sv if sv and sv.lower() != "nan" else fallback)
    return out


def _flush_batch(db, raw_conn, is_postgres: bool, rows_tuples: list, file_id: int | None, total_rows: int):
    """Writes a vectorized batch via native PostgreSQL COPY FROM STDIN (or Core INSERT on SQLite)."""
    if not rows_tuples:
        return

    if is_postgres and raw_conn is not None:
        with raw_conn.cursor() as cur:
            with cur.copy(
                "COPY transactions "
                "(user_id, file_id, date, amount, category, product_sku, customer_id, "
                "cost_amount, net_profit_amount, units_sold, stock_remaining, raw_data) "
                "FROM STDIN"
            ) as copy:
                for t in rows_tuples:
                    copy.write_row(t)
            if file_id is not None:
                cur.execute(
                    "UPDATE file_records SET rows_loaded = %s WHERE id = %s",
                    (total_rows, file_id),
                )
        raw_conn.commit()
    else:
        dicts = [
            {
                "user_id": t[0],
                "file_id": t[1],
                "date": t[2],
                "amount": t[3],
                "category": t[4],
                "product_sku": t[5],
                "customer_id": t[6],
                "cost_amount": t[7],
                "net_profit_amount": t[8],
                "units_sold": t[9],
                "stock_remaining": t[10],
                "raw_data": json.loads(t[11]) if t[11] is not None else None,
            }
            for t in rows_tuples
        ]
        db.bulk_insert_mappings(Transaction, dicts)
        if file_id is not None:
            db.query(FileRecord).filter(FileRecord.id == file_id).update({"rows_loaded": total_rows})
        db.commit()
        db.expunge_all()


def process_and_load_csv(file_path: str, user_id: int, file_id: int = None):
    """High-throughput vectorized streaming ETL capable of loading 1,000,000+ rows smoothly."""
    db = db_mod.SessionLocal()
    bind = db.get_bind()
    is_postgres = "sqlite" not in str(bind.url)
    raw_conn = bind.raw_connection() if is_postgres else None

    try:
        enc, sep, original_cols, sample_df = detect_csv_config(file_path)
        sample_rows = sample_df.head(3).to_dict(orient="records")

        ai_mapping = ask_llm_for_multilingual_mapping(original_cols, sample_rows)

        amount_norm = _norm(ai_mapping.get("amount") or "")
        is_unit_price_amount = amount_norm in {"price", "priceeach", "price_each", "unit_price", "unitprice", "preco", "prix", "preis"}
        unit_price_col = None
        if (not ai_mapping.get("amount") or is_unit_price_amount) and ai_mapping.get("quantity"):
            unit_price_col = ai_mapping.get("amount") if is_unit_price_amount else _pick_best_column(
                original_cols, set(),
                ("priceeach", "price_each", "unit_price", "unitprice", "price", "preco", "prix", "preis"),
                ("price", "preco", "prix", "preis"),
                exclude_tokens=("msrp", "cost"),
            )
            if unit_price_col:
                ai_mapping["amount"] = "__computed_amount"

        is_wide_melt = False
        value_vars = []
        id_vars = []
        if not ai_mapping.get("amount"):
            numeric_cols = sample_df.select_dtypes(include=["number"]).columns.tolist()
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
                is_wide_melt = True
                id_vars = [c for c in original_cols if c not in value_vars]
                ai_mapping["amount"] = "__melted_amount"
                ai_mapping["category"] = "__melted_category"
                if not ai_mapping.get("date"):
                    ai_mapping["date"] = "__mock_date"

        date_col = ai_mapping.get("date")
        amount_col = ai_mapping.get("amount")
        category_col = ai_mapping.get("category")
        sku_col = ai_mapping.get("product_sku")
        customer_col = ai_mapping.get("customer_id")
        quantity_col = ai_mapping.get("quantity")
        remaining_col = ai_mapping.get("remaining")

        dayfirst = (
            detect_dayfirst(sample_df[date_col])
            if date_col and date_col in sample_df.columns
            else False
        )
        default_date = datetime.today().strftime("%Y-%m-%d")

        cost_col = _find_financial_column(original_cols, ("cost", "cogs", "expense", "expenses", "wholesale"))
        net_col = _find_financial_column(original_cols, ("net_profit", "profit", "net_income", "earnings", "earning", "margin"))

        total_rows_loaded = 0
        chunk_iter = pd.read_csv(
            file_path,
            encoding=enc,
            sep=sep,
            chunksize=CSV_CHUNK_SIZE,
            on_bad_lines="skip",
            low_memory=True,
        )

        for raw_chunk in chunk_iter:
            chunk = _clean_chunk(raw_chunk, original_cols)
            if chunk.empty:
                continue

            if unit_price_col and quantity_col and unit_price_col in chunk.columns and quantity_col in chunk.columns:
                chunk["__computed_amount"] = _series_to_float(chunk[quantity_col], 0.0) * _series_to_float(chunk[unit_price_col], 0.0)

            if is_wide_melt:
                chunk_value_vars = [c for c in value_vars if c in chunk.columns]
                chunk_id_vars = [c for c in id_vars if c in chunk.columns]
                if not chunk_value_vars:
                    continue
                chunk = pd.melt(
                    chunk,
                    id_vars=chunk_id_vars,
                    value_vars=chunk_value_vars,
                    var_name="__melted_category",
                    value_name="__melted_amount",
                )
                if date_col == "__mock_date" and "__mock_date" not in chunk.columns:
                    dates = pd.date_range(end=pd.Timestamp.today(), periods=90)
                    chunk["__mock_date"] = pd.to_datetime(np.random.choice(dates, len(chunk))).strftime("%Y-%m-%d")

            n = len(chunk)
            dates_list = (
                normalize_date_series(chunk[date_col], default_date, dayfirst=dayfirst)
                if date_col and date_col in chunk.columns
                else [default_date] * n
            )
            amounts_s = _series_to_float(chunk[amount_col], 0.0).round(2) if amount_col and amount_col in chunk.columns else pd.Series(0.0, index=chunk.index)
            amounts_list = amounts_s.tolist()

            if cost_col and cost_col in chunk.columns:
                cost_s = _series_to_float(chunk[cost_col], np.nan)
                cost_s = cost_s.where(cost_s.notna(), amounts_s * 0.65).round(2)
            else:
                cost_s = (amounts_s * 0.65).round(2)
            cost_list = cost_s.tolist()

            if net_col and net_col in chunk.columns:
                net_s = _series_to_float(chunk[net_col], np.nan)
                net_s = net_s.where(net_s.notna(), amounts_s * 0.15).round(2)
            else:
                net_s = (amounts_s * 0.15).round(2)
            net_list = net_s.tolist()

            if quantity_col and quantity_col in chunk.columns:
                qty_s = _series_to_float(chunk[quantity_col], 0.0).round().astype(int)
                sold_list = [int(q) if q > 0 else None for q in qty_s.tolist()]
            else:
                sold_list = [None] * n

            if remaining_col and remaining_col in chunk.columns:
                rem_s = _series_to_float(chunk[remaining_col], -1.0)
                rem_list = [max(0, int(round(r))) if r >= 0 else None for r in rem_s.tolist()]
            else:
                rem_list = [None] * n

            cat_list = _normalize_text_col(chunk[category_col], "Uncategorized") if category_col and category_col in chunk.columns else ["Uncategorized"] * n
            sku_list = _normalize_text_col(chunk[sku_col], "UNKNOWN") if sku_col and sku_col in chunk.columns else ["UNKNOWN"] * n
            cust_list = _normalize_text_col(chunk[customer_col], "1") if customer_col and customer_col in chunk.columns else ["1"] * n

            # Store full per-row raw_data JSON only up to RAW_DATA_ROW_LIMIT so 100k-1M+ row datasets
            # don't exhaust database storage or serialize millions of redundant string blobs.
            include_raw = total_rows_loaded < RAW_DATA_ROW_LIMIT
            raw_json_strs = [None] * n
            if include_raw:
                rows_to_keep = min(n, RAW_DATA_ROW_LIMIT - total_rows_loaded)
                raw_dicts = chunk.iloc[:rows_to_keep].to_dict(orient="records")
                for i in range(rows_to_keep):
                    rec = sanitize_json_value(raw_dicts[i])
                    rec["cost"] = cost_list[i]
                    rec["net_profit"] = net_list[i]
                    if sold_list[i] is not None:
                        rec["sold"] = sold_list[i]
                    if rem_list[i] is not None:
                        rec["remaining"] = rem_list[i]
                    raw_json_strs[i] = json.dumps(rec, allow_nan=False)

            batch_tuples = [
                (
                    user_id,
                    file_id,
                    dates_list[i],
                    float(amounts_list[i]),
                    cat_list[i],
                    sku_list[i],
                    cust_list[i],
                    float(cost_list[i]),
                    float(net_list[i]),
                    sold_list[i],
                    rem_list[i],
                    raw_json_strs[i],
                )
                for i in range(n)
            ]

            total_rows_loaded += n
            _flush_batch(db, raw_conn, is_postgres, batch_tuples, file_id, total_rows_loaded)

        if total_rows_loaded == 0:
            raise ValueError("CSV file contains no readable data rows.")

        return {"status": "Success", "rows_loaded": total_rows_loaded, "detected_mapping": ai_mapping}
    except Exception as e:
        db.rollback()
        if raw_conn is not None:
            try:
                raw_conn.rollback()
            except Exception:
                pass
        raise e
    finally:
        if raw_conn is not None:
            try:
                raw_conn.close()
            except Exception:
                pass
        db.close()
