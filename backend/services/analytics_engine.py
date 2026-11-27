from datetime import datetime
import pandas as pd
from sqlalchemy import func
from sqlalchemy.orm import Session
from models.database import FileRecord, IntegrationSetting, Transaction
from services.etl_service import parse_numeric


def _parse_mixed_dates(date_series: pd.Series) -> pd.Series:
    """Parses ISO YYYY-MM-DD cleanly without flipping US MM/DD/YYYY dates."""
    non_null = date_series.dropna().astype(str).str.strip()
    if non_null.empty:
        return pd.Series([], dtype="datetime64[ns]")
    iso_ratio = non_null.str.match(r"^\d{4}-\d{2}-\d{2}").mean()
    if iso_ratio >= 0.8:
        return pd.to_datetime(date_series, format="mixed", dayfirst=False, errors="coerce")

    dayfirst = False
    slash_samples = non_null[non_null.str.contains(r"^\d{1,2}/\d{1,2}/\d{2,4}", regex=True)].head(100)
    if not slash_samples.empty:
        parts = slash_samples.str.extract(r"^(\d{1,2})/(\d{1,2})/(\d{2,4})").dropna()
        if not parts.empty:
            first_gt_12 = bool((pd.to_numeric(parts[0], errors="coerce").dropna() > 12).any())
            second_gt_12 = bool((pd.to_numeric(parts[1], errors="coerce").dropna() > 12).any())
            dayfirst = first_gt_12 and not second_gt_12
    return pd.to_datetime(date_series, format="mixed", dayfirst=dayfirst, errors="coerce")


def get_overview_data(db: Session, user_id: int):
    # Check if user has completed uploaded files or active connected store channels
    file_count = db.query(FileRecord).filter(
        FileRecord.user_id == user_id,
        FileRecord.status == "completed",
    ).count()
    connected_count = db.query(IntegrationSetting).filter(
        IntegrationSetting.user_id == user_id,
        IntegrationSetting.is_connected == 1,
    ).count()

    # If the user has not uploaded any completed dataset and has no active integrations,
    # purge unlinked test artifacts and return clean authentic empty state.
    if file_count == 0 and connected_count == 0:
        db.query(Transaction).filter(Transaction.user_id == user_id, Transaction.file_id == None).delete()
        db.commit()
        return {
            "kpis": {
                "total_revenue": 0.0,
                "clv": 0.0,
                "mom_growth": 0.0,
                "top_region": None,
            },
            "revenue_trend": [],
        }

    daily_sales = (
        db.query(Transaction.date, func.sum(Transaction.amount).label("daily_revenue"))
        .filter(Transaction.user_id == user_id)
        .group_by(Transaction.date)
        .order_by(Transaction.date)
        .all()
    )

    df = pd.DataFrame([(row.date, row.daily_revenue) for row in daily_sales], columns=["date", "revenue"])

    total_rev = 0.0
    clv = 0.0
    mom_growth = 0.0
    top_region = None
    revenue_trend = []

    if not df.empty:
        df["date"] = _parse_mixed_dates(df["date"])
        df = df.dropna(subset=["date"])

        if not df.empty:
            # Re-aggregate after date normalization in case legacy dates collapsed to the same day
            df = df.groupby("date", as_index=False)["revenue"].sum().sort_values(by="date")

            total_rev = float(df["revenue"].sum())

            unique_customers = (
                db.query(func.count(func.distinct(Transaction.customer_id)))
                .filter(Transaction.user_id == user_id)
                .scalar()
                or 1
            )
            clv = float(total_rev / unique_customers)

            max_date = df["date"].max()
            current_month_start = max_date - pd.Timedelta(days=30)
            prev_month_start = current_month_start - pd.Timedelta(days=30)

            current_rev = float(df[df["date"] > current_month_start]["revenue"].sum())
            prev_rev = float(df[(df["date"] > prev_month_start) & (df["date"] <= current_month_start)]["revenue"].sum())

            if prev_rev > 0:
                mom_growth = round(float(((current_rev - prev_rev) / prev_rev) * 100), 1)
            elif current_rev > 0:
                mom_growth = 100.0

            df["date_str"] = df["date"].dt.strftime("%Y-%m-%d")
            revenue_trend = [
                {"date": row["date_str"], "revenue": round(float(row["revenue"]), 2)}
                for _, row in df.iterrows()
            ]

    return {
        "kpis": {
            "total_revenue": round(total_rev, 2),
            "clv": round(clv, 2),
            "mom_growth": round(mom_growth, 2),
            "top_region": top_region,
        },
        "revenue_trend": revenue_trend,
    }


def get_cashflow_data(db: Session, user_id: int):
    # Check if user has completed uploaded files or active connected store channels
    file_count = db.query(FileRecord).filter(
        FileRecord.user_id == user_id,
        FileRecord.status == "completed",
    ).count()
    connected_count = db.query(IntegrationSetting).filter(
        IntegrationSetting.user_id == user_id,
        IntegrationSetting.is_connected == 1,
    ).count()

    if file_count == 0 and connected_count == 0:
        return {
            "cashflow": [],
            "financial_metrics": {
                "operating_cash_flow": 0.0,
                "burn_rate": 0.0,
                "break_even": 0.0,
                "gross_margin": None,
                "net_margin": None,
                "expense_ratio": None,
                "roi": None,
            },
        }

    daily_sales = (
        db.query(Transaction.date, func.sum(Transaction.amount).label("daily_revenue"))
        .filter(Transaction.user_id == user_id)
        .group_by(Transaction.date)
        .order_by(Transaction.date)
        .all()
    )

    df = pd.DataFrame([(row.date, row.daily_revenue) for row in daily_sales], columns=["date", "amount"])
    cashflow_list = []
    parsed_dates = []
    if not df.empty:
        df["parsed_date"] = _parse_mixed_dates(df["date"])
        valid_df = df.dropna(subset=["parsed_date"])
        if not valid_df.empty:
            grouped = valid_df.groupby("parsed_date", as_index=False)["amount"].sum().sort_values("parsed_date")
            parsed_dates = grouped["parsed_date"].tolist()
            cashflow_list = [
                {"date": row["parsed_date"].strftime("%Y-%m-%d"), "amount": round(float(row["amount"]), 2)}
                for _, row in grouped.iterrows()
            ]
        else:
            cashflow_list = [
                {"date": str(row.date), "amount": round(float(row.daily_revenue), 2)}
                for row in daily_sales
            ]

    total_rev = sum(item["amount"] for item in cashflow_list) if cashflow_list else 0.0

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

    # Safely sum normalized cost / net_profit from raw_data without risky SQL JSON float casts
    try:
        tx_rows = db.query(Transaction.amount, Transaction.raw_data).filter(Transaction.user_id == user_id).all()
        for tx_amt, raw_json in tx_rows:
            if not isinstance(raw_json, dict):
                continue
            if raw_json.get("cost") is not None:
                has_cost = True
                total_cost += parse_numeric(raw_json.get("cost"), 0.0)
            if raw_json.get("net_profit") is not None:
                has_net = True
                total_net += parse_numeric(raw_json.get("net_profit"), 0.0)
    except Exception:
        total_cost = 0.0
        total_net = 0.0
        has_cost = False
        has_net = False

    if has_cost and total_rev > 0:
        gross_margin = round(((total_rev - total_cost) / total_rev) * 100, 2)
        expense_ratio = round((total_cost / total_rev) * 100, 2)
        if total_cost > 0:
            roi = round(((total_rev - total_cost) / total_cost) * 100, 2)

    if has_net and total_rev > 0:
        net_margin = round((total_net / total_rev) * 100, 2)

    if has_cost and cashflow_list:
        try:
            if len(parsed_dates) >= 2:
                days_diff = (parsed_dates[-1] - parsed_dates[0]).days
            else:
                first_date = datetime.strptime(cashflow_list[0]["date"], "%Y-%m-%d")
                last_date = datetime.strptime(cashflow_list[-1]["date"], "%Y-%m-%d")
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
        "cashflow": cashflow_list,
        "financial_metrics": {
            "gross_margin": gross_margin,
            "net_margin": net_margin,
            "operating_cash_flow": round(operating_cash_flow, 2),
            "burn_rate": burn_rate,
            "break_even": break_even,
            "expense_ratio": expense_ratio,
            "roi": roi,
        },
    }
