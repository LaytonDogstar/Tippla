"""
Tippla mock data generator.

Generates internally consistent sample data for three fictional personas:
  - transactions (source of truth)
  - a TaleFin-shaped bank statement analysis response (AM metrics computed FROM the transactions)
  - a TaleFin Score V2 response plus a Tippla-stored score history

Every figure in the portal must be derivable from these files, so numbers never disagree
between screens. Re-run with:  python scripts/generate_mock_data.py
All people, employers and figures are fictional.
"""
import json, random, statistics, os
from datetime import date, timedelta

OUT = os.path.join(os.path.dirname(__file__), "..", "mock-data")
AS_OF = date(2026, 9, 25)          # "today" for all fixtures (a Friday)
PERIODS = [14, 30, 60, 90, 180, 365]

# Tippla category taxonomy. talefin_category_id values are PLACEHOLDERS except 23 and 35
# (the only ids confirmed in the product spec) - confirm the full AM2151 list with TaleFin.
CATEGORIES = {
    "housing":      {"name": "Rent & housing",   "type": "essential", "talefin_category_id": 35},
    "groceries":    {"name": "Groceries",        "type": "essential", "talefin_category_id": 101},
    "food":         {"name": "Food & dining",    "type": "lifestyle", "talefin_category_id": 102},
    "transport":    {"name": "Transport",        "type": "essential", "talefin_category_id": 103},
    "bills":        {"name": "Bills & utilities","type": "essential", "talefin_category_id": 104},
    "subscriptions":{"name": "Subscriptions",    "type": "lifestyle", "talefin_category_id": 105},
    "entertainment":{"name": "Entertainment",    "type": "lifestyle", "talefin_category_id": 106},
    "alcohol":      {"name": "Alcohol",          "type": "lifestyle", "talefin_category_id": 23},
    "gambling":     {"name": "Gambling",         "type": "lifestyle", "talefin_category_id": 107},
    "health":       {"name": "Health",           "type": "essential", "talefin_category_id": 108},
    "shopping":     {"name": "Shopping",         "type": "lifestyle", "talefin_category_id": 109},
    "loan_repayment":{"name": "Loan repayments", "type": "essential", "talefin_category_id": 110},
    "bnpl":         {"name": "Buy now, pay later","type": "essential","talefin_category_id": 111},
    "wage_advance": {"name": "Pay advances",     "type": "essential", "talefin_category_id": 112},
    "cash":         {"name": "Cash withdrawals", "type": "lifestyle", "talefin_category_id": 113},
    "fees":         {"name": "Bank fees",        "type": "essential", "talefin_category_id": 114},
    "income":       {"name": "Income",           "type": "income",    "talefin_category_id": None},
}

PERSONAS = {
 "jess": {
   "profile": {"first_name": "Jess", "full_name": "Jess Taylor", "age": 31, "state": "NSW",
               "postcode": "2150", "email": "jess.taylor@example.com", "mobile": "0412 345 678",
               "tier": "standard", "story": "Hospitality shift worker, paid fortnightly. Declined by Friendly Finance for $2,500. Score slipping: new pay advance and more gambling this month."},
   "days": 180, "seed": 7, "start_balance": 420.0,
   "wage": {"employer": "HARBOURSIDE HOSPITALITY PTY", "amount": 2340.0, "jitter": 180.0, "first": date(2026, 4, 2)},
   "centrelink": None,
   "rent": {"desc": "RAY WHITE PARRAMATTA RENT", "amount": 820.0, "offset": 1},
   "loans": [
      {"type": "SACC", "provider": "Nimble", "repay": 96.0, "every": 14, "offset": 2, "balance": 610.0},
      {"type": "SACC", "provider": "Cash Train", "repay": 74.0, "every": 14, "offset": 3, "balance": 450.0, "start_day": 40},
      {"type": "MACC", "provider": "Right Road Finance", "repay": 120.0, "every": 14, "offset": 5, "balance": 2140.0},
   ],
   "bnpl": [{"provider": "Afterpay", "repay": 45.0, "every": 14, "offset": 6}, {"provider": "Zip Pay", "repay": 40.0, "every": 30, "offset": 12}],
   "wage_advance": {"provider": "Beforepay", "credit": 300.0, "start_day": 150, "every": 14},
   "gambling": {"merchants": ["SPORTSBET", "TAB", "LADBROKES"], "base": 55.0, "growth": 1.9, "per_cycle": 3},
   "subscriptions": [("NETFLIX", 18.99, 3), ("STAN", 12.0, 9), ("SPOTIFY", 13.99, 15), ("APPLE ICLOUD", 4.49, 20)],
   "score": {"SCORE": 472, "RISK_GRADE": "4", "prev": [521, 515, 506, 498, 489],
             "breakdown": {"INCOME": 7.4, "CASH_SPEND": 6.1, "ADVERSE_SPEND": 3.2, "MISSED_PAYMENT": 5.6,
                           "PRODUCTIVE_SPEND": 5.0, "DISPOSABLE_INCOME": 3.4, "GOVERNMENT_RELIANCE": 10.0,
                           "LOAN_AMOUNT_AND_TYPE": 2.9, "RELIABLE_PAYMENT_HISTORY": 6.8},
             "override": None},
   "dishonour_days": [118, 163],
 },
 "marcus": {
   "profile": {"first_name": "Marcus", "full_name": "Marcus Webb", "age": 44, "state": "QLD",
               "postcode": "4114", "email": "marcus.webb@example.com", "mobile": "0433 210 987",
               "tier": "pro", "story": "Part-time warehouse work plus Centrelink Family Tax Benefit. Paid off one SACC two months ago; score improving and close to lender-ready."},
   "days": 180, "seed": 11, "start_balance": 210.0,
   "wage": {"employer": "SOUTHSIDE LOGISTICS", "amount": 1380.0, "jitter": 90.0, "first": date(2026, 4, 9)},
   "centrelink": {"desc": "CENTRELINK FTB", "amount": 412.0, "first": date(2026, 4, 8)},
   "rent": {"desc": "QLD HOUSING RENT", "amount": 560.0, "offset": 2},
   "loans": [
      {"type": "SACC", "provider": "MoneyMe Lite", "repay": 88.0, "every": 14, "offset": 3, "balance": 0.0, "end_day": 120},
      {"type": "AOCC", "provider": "Latitude", "repay": 60.0, "every": 30, "offset": 10, "balance": 1180.0},
   ],
   "bnpl": [{"provider": "Afterpay", "repay": 32.0, "every": 14, "offset": 7}],
   "wage_advance": None,
   "gambling": None,
   "subscriptions": [("NETFLIX", 18.99, 5), ("KAYO", 25.0, 12)],
   "score": {"SCORE": 612, "RISK_GRADE": "6", "prev": [548, 561, 577, 589, 601],
             "breakdown": {"INCOME": 6.2, "CASH_SPEND": 7.8, "ADVERSE_SPEND": 9.6, "MISSED_PAYMENT": 8.4,
                           "PRODUCTIVE_SPEND": 6.1, "DISPOSABLE_INCOME": 5.9, "GOVERNMENT_RELIANCE": 4.1,
                           "LOAN_AMOUNT_AND_TYPE": 6.7, "RELIABLE_PAYMENT_HISTORY": 7.9},
             "override": None},
   "dishonour_days": [],
 },
 "priya": {
   "profile": {"first_name": "Priya", "full_name": "Priya Raman", "age": 26, "state": "VIC",
               "postcode": "3029", "email": "priya.raman@example.com", "mobile": "0455 876 123",
               "tier": "standard", "story": "Recently changed banks. Only 45 days of history connected, so TaleFin returns a thin-file override and no score yet."},
   "days": 45, "seed": 19, "start_balance": 1320.0,
   "wage": {"employer": "COLES SUPERMARKETS", "amount": 1960.0, "jitter": 60.0, "first": date(2026, 8, 13)},
   "centrelink": None,
   "rent": {"desc": "SHARE HOUSE RENT - BPAY", "amount": 620.0, "offset": 1},
   "loans": [], "bnpl": [{"provider": "Afterpay", "repay": 28.0, "every": 14, "offset": 4}],
   "wage_advance": None, "gambling": None,
   "subscriptions": [("SPOTIFY", 13.99, 6)],
   "score": {"SCORE": None, "RISK_GRADE": None, "prev": [],
             "breakdown": {k: None for k in ["INCOME","CASH_SPEND","ADVERSE_SPEND","MISSED_PAYMENT","PRODUCTIVE_SPEND","DISPOSABLE_INCOME","GOVERNMENT_RELIANCE","LOAN_AMOUNT_AND_TYPE","RELIABLE_PAYMENT_HISTORY"]},
             "override": {"OVERRIDE": "Thin File Detected", "OVERRIDE_SCORE": -998}},
   "dishonour_days": [],
 },
}

EVERYDAY = {
  "groceries": (["WOOLWORTHS", "COLES", "ALDI"], 2.2, 38, 95),
  "food": (["UBER EATS", "GUZMAN Y GOMEZ", "THE COFFEE CLUB", "MCDONALDS", "GRILL'D"], 4.5, 7, 42),
  "transport": (["OPAL TOP UP", "AMPOL", "7-ELEVEN FUEL", "UBER TRIP"], 2.0, 15, 70),
  "entertainment": (["EVENT CINEMAS", "TIMEZONE", "TICKETEK"], 0.5, 18, 60),
  "alcohol": (["BWS", "DAN MURPHYS"], 0.7, 18, 55),
  "health": (["CHEMIST WAREHOUSE", "PRICELINE PHARMACY"], 0.4, 12, 40),
  "shopping": (["KMART", "BIG W", "AMAZON AU"], 0.7, 15, 80),
  "cash": (["ATM WITHDRAWAL"], 0.35, 40, 100),
}

def r2(x): return round(x + 0.0, 2)

def build(pid, p):
    rnd = random.Random(p["seed"])
    start = AS_OF - timedelta(days=p["days"] - 1)
    tx = []
    def add(d, desc, amt, cat, merchant=None, recurring=False, sub=None, status="posted"):
        tx.append({"date": d.isoformat(), "description": desc, "merchant": merchant or desc.title(),
                   "amount": r2(amt), "category": cat, "subcategory": sub, "is_recurring": recurring,
                   "status": status, "account_id": 1})
    for i in range(p["days"]):
        d = start + timedelta(days=i)
        di = i  # day index from start
        w = p["wage"]
        if d >= w["first"] and (d - w["first"]).days % 14 == 0:
            add(d, f"SALARY {w['employer']}", w["amount"] + rnd.uniform(-w["jitter"], w["jitter"]), "income", w["employer"].title(), True, "wages")
            pay_idx = (d - w["first"]).days // 14
        if p["centrelink"] and d >= p["centrelink"]["first"] and (d - p["centrelink"]["first"]).days % 14 == 0:
            add(d, p["centrelink"]["desc"], p["centrelink"]["amount"], "income", "Centrelink", True, "centrelink")
        # rent / loans / bnpl keyed off the pay cycle
        if d >= w["first"] - timedelta(days=13):
            k = (d - w["first"]).days % 14
            if k == p["rent"]["offset"]:
                add(d, p["rent"]["desc"], -p["rent"]["amount"], "housing", p["rent"]["desc"].title(), True)
            for L in p["loans"]:
                if L.get("start_day") and di < L["start_day"]: continue
                if L.get("end_day") and di > L["end_day"]: continue
                if (L["every"] == 14 and k == L["offset"]) or (L["every"] == 30 and d.day == L["offset"]):
                    add(d, f"{L['provider'].upper()} DD REPAYMENT", -L["repay"], "loan_repayment", L["provider"], True, L["type"].lower())
            for B in p["bnpl"]:
                if (B["every"] == 14 and k == B["offset"]) or (B["every"] == 30 and d.day == B["offset"]):
                    add(d, f"{B['provider'].upper()} INSTALMENT", -B["repay"], "bnpl", B["provider"], True)
        if p["wage_advance"] and di >= p["wage_advance"]["start_day"] and (di - p["wage_advance"]["start_day"]) % 14 == 0:
            add(d, f"{p['wage_advance']['provider'].upper()} ADVANCE", p["wage_advance"]["credit"], "wage_advance", p["wage_advance"]["provider"], False, "advance_credit")
            if d + timedelta(days=6) <= AS_OF:
                add(d + timedelta(days=6), f"{p['wage_advance']['provider'].upper()} REPAYMENT", -(p["wage_advance"]["credit"] * 1.05), "wage_advance", p["wage_advance"]["provider"], True, "advance_repayment")
        for (m, a, dom) in p["subscriptions"]:
            if d.day == dom: add(d, m, -a, "subscriptions", m.title(), True)
        if d.day == 20: add(d, "ORIGIN ENERGY", -rnd.uniform(78, 118), "bills", "Origin Energy", True)
        if d.day == 26: add(d, "TELSTRA PREPAID", -52.0, "bills", "Telstra", True)
        for cat, (merchants, per_week, lo, hi) in EVERYDAY.items():
            if rnd.random() < per_week / 7:
                m = rnd.choice(merchants)
                add(d, m, -rnd.uniform(lo, hi), cat, m.title())
        g = p["gambling"]
        if g:
            growth = 1 + (g["growth"] - 1) * (di / p["days"]) ** 2
            if rnd.random() < g["per_cycle"] / 14 * (0.8 + di / p["days"]):
                m = rnd.choice(g["merchants"])
                add(d, f"{m} DEPOSIT", -round(g["base"] * growth * rnd.uniform(0.6, 1.6) / 5) * 5, "gambling", m.title())
    for dday in p["dishonour_days"]:
        if dday < p["days"]:
            d = start + timedelta(days=dday)
            add(d, "DISHONOUR FEE - NIMBLE DD", -15.0, "fees", "Bank fee", False, "dishonour")
    tx.sort(key=lambda t: (t["date"], -t["amount"]))
    bal = p["start_balance"]; daily = {}
    for n, t in enumerate(tx):
        t["id"] = f"{pid}_tx_{n:04d}"
        bal = r2(bal + t["amount"]); t["balance_after"] = bal
        daily[t["date"]] = bal
    # end of day balance for every day
    eod, last = [], p["start_balance"]
    for i in range(p["days"]):
        ds = (start + timedelta(days=i)).isoformat()
        last = daily.get(ds, last); eod.append({"date": ds, "balance": r2(last)})
    # pending transaction today, to exercise UI state
    tx.append({"id": f"{pid}_tx_pending", "date": AS_OF.isoformat(), "description": "WOOLWORTHS PENDING", "merchant": "Woolworths",
               "amount": -23.40, "category": "groceries", "subcategory": None, "is_recurring": False, "status": "pending", "account_id": 1, "balance_after": None})
    return start, tx, eod

def window(tx, days, pred=lambda t: True):
    cut = AS_OF - timedelta(days=days - 1)
    return [t for t in tx if t["status"] == "posted" and date.fromisoformat(t["date"]) >= cut and pred(t)]

def agg(items, days):
    amts = [abs(t["amount"]) for t in items]
    if not amts:
        return {"sum_amount": 0.0, "count": 0, "min_amount": None, "max_amount": None, "mean_amount": None,
                "monthly_mean_amount": 0.0, "days_since_last": None, "days_since_first": None, "earliest": None, "latest": None}
    ds = sorted(t["date"] for t in items)
    return {"sum_amount": r2(sum(amts)), "count": len(amts), "min_amount": r2(min(amts)), "max_amount": r2(max(amts)),
            "mean_amount": r2(statistics.mean(amts)), "monthly_mean_amount": r2(sum(amts) / days * (365 / 12)),
            "days_since_last": (AS_OF - date.fromisoformat(ds[-1])).days, "days_since_first": (AS_OF - date.fromisoformat(ds[0])).days,
            "earliest": ds[0], "latest": ds[-1]}

def monthly(tx, pred):
    out = {}
    for k in range(6):
        y, m = AS_OF.year, AS_OF.month - k
        while m <= 0: m += 12; y -= 1
        items = [t for t in tx if t["status"] == "posted" and pred(t) and t["date"][:7] == f"{y}-{m:02d}"]
        out[str(k)] = {"month": f"{y}-{m:02d}", "sum_amount": r2(sum(abs(t["amount"]) for t in items)), "count": len(items)}
    return out

def metric(code, name, group, fmt, value):
    return {"code": code, "name": name, "group_name": group, "format": fmt, "value": value}

def arr_metric(code, name, group, tx, pred, days_avail):
    v = {str(pd): agg(window(tx, min(pd, days_avail), pred), min(pd, days_avail)) for pd in PERIODS}
    v["monthly_values"] = monthly(tx, pred)
    return metric(code, name, group, "array", v)

def pct_metric(code, name, group, num_pred, den_pred, tx, days_avail):
    v = {}
    for pd in PERIODS:
        n = sum(abs(t["amount"]) for t in window(tx, min(pd, days_avail), num_pred))
        dd = sum(abs(t["amount"]) for t in window(tx, min(pd, days_avail), den_pred))
        v[str(pd)] = r2(n / dd * 100) if dd else None
    return metric(code, name, group, "percentage", v)

def build_talefin(pid, p, start, tx, eod):
    D = p["days"]
    inc = lambda t: t["category"] == "income"
    wage = lambda t: t["subcategory"] == "wages"
    cl = lambda t: t["subcategory"] == "centrelink"
    deb = lambda t: t["amount"] < 0
    gam = lambda t: t["category"] == "gambling"
    living = lambda t: t["category"] in ("groceries", "food", "transport", "bills", "health")
    loanr = lambda t: t["category"] == "loan_repayment"
    wa_c = lambda t: t["subcategory"] == "advance_credit"
    wa_d = lambda t: t["subcategory"] == "advance_repayment"
    bnpl = lambda t: t["category"] == "bnpl"
    dish = lambda t: t["subcategory"] == "dishonour"
    atm = lambda t: t["category"] == "cash"
    dd = lambda t: t["is_recurring"] and t["amount"] < 0
    m = []
    m.append(arr_metric("AM2001", "Wages", "Income", tx, wage, D))
    m.append(arr_metric("AM2002", "Centrelink", "Income", tx, cl, D))
    m.append(arr_metric("AM2003", "Total Credits", "Information", tx, lambda t: t["amount"] > 0, D))
    m.append(arr_metric("AM2004", "Total Debits", "Information", tx, deb, D))
    m.append(arr_metric("AM2005", "Confirmed Gambling", "Expenses", tx, gam, D))
    m.append(arr_metric("AM2008", "Living Expenses", "Expenses", tx, living, D))
    m.append(arr_metric("AM2010", "Housing Costs", "Expenses", tx, lambda t: t["category"] == "housing", D))
    m.append(arr_metric("AM2011", "All Direct Debit Dishonours", "Risk", tx, dish, D))
    m.append(arr_metric("AM2012", "Other Credits", "Income", tx, lambda t: t["amount"] > 0 and not inc(t), D))
    m.append(arr_metric("AM2013", "Direct Debits", "Information", tx, dd, D))
    m.append(arr_metric("AM2015", "Inferred Gambling", "Risk", tx, lambda t: False, D))
    m.append(arr_metric("AM2020", "ATM Withdrawals", "Information", tx, atm, D))
    m.append(arr_metric("AM2072", "Total Income", "Income", tx, inc, D))
    m.append(arr_metric("AM2128", "BNPL Transactions", "Loans", tx, bnpl, D))
    m.append(arr_metric("AM2138", "Wage Advance Credits", "Loans", tx, wa_c, D))
    m.append(arr_metric("AM2139", "Wage Advance Debits", "Loans", tx, wa_d, D))
    m.append(pct_metric("AM2023", "Combined Gambling % of Income", "Risk Percentages", gam, inc, tx, D))
    m.append(pct_metric("AM2031", "Confirmed Gambling % of Income", "Risk Percentages", gam, inc, tx, D))
    m.append(pct_metric("AM2033", "Centrelink % of Income", "Risk Percentages", cl, inc, tx, D))
    m.append(pct_metric("AM2034", "Withdrawals % of Income", "Risk Percentages", deb, inc, tx, D))
    m.append(pct_metric("AM2069", "Debt to Income Ratio", "Expenses", lambda t: loanr(t) or bnpl(t) or wa_d(t), inc, tx, D))
    # scalar metrics
    last_inc = max(t["date"] for t in tx if inc(t) and t["status"] == "posted")
    last_wage = max(t["date"] for t in tx if wage(t) and t["status"] == "posted")
    next_pay = date.fromisoformat(last_wage) + timedelta(days=14)
    wage_amts = [t["amount"] for t in window(tx, 90, wage)]
    m += [
      metric("AM2163", "Employer Name", "Income", "string", p["wage"]["employer"].split(" ")[0]),
      metric("AM2101", "Primary Income Type", "Income", "string", "Wages"),
      metric("AM2038", "Employment Status", "Income", "boolean", True),
      metric("AM2021", "Days Since Last Income", "Income", "days", (AS_OF - date.fromisoformat(last_inc)).days),
      metric("AM2074", "Days Since Last Wage", "Income", "days", (AS_OF - date.fromisoformat(last_wage)).days),
      metric("AM2077", "Next Expected Pay Date", "Income", "date", next_pay.isoformat()),
      metric("AM2110", "Irregular Wages Present", "Income", "boolean", (statistics.pstdev(wage_amts) / statistics.mean(wage_amts)) > 0.05 if len(wage_amts) > 1 else None),
    ]
    loans = p["loans"]
    act = lambda typ: [L for L in loans if L["type"] == typ and not L.get("end_day")]
    m += [
      metric("AM2025", "SACC Loans Present", "Information", "boolean", bool(act("SACC"))),
      metric("AM2026", "MACC Loans Present", "Information", "boolean", bool(act("MACC"))),
      metric("AM2027", "AOCC Loans Present", "Information", "boolean", bool(act("AOCC"))),
      metric("AM2172", "Estimated Active SACC Count", "Loans", "count", len(act("SACC"))),
      metric("AM2173", "Estimated Active MACC Count", "Loans", "count", len(act("MACC"))),
      metric("AM2174", "Estimated Active AOCC Count", "Loans", "count", len(act("AOCC"))),
      metric("AM2175", "Active Wage Advance Providers", "Loans", "count", 1 if p["wage_advance"] else 0),
      metric("AM2024", "SACC Outstanding Balance (estimated)", "Loans", "currency", r2(sum(L["balance"] for L in act("SACC")))),
      metric("AM2132", "Non-SACC Outstanding Balance (estimated)", "Loans", "currency", r2(sum(L["balance"] for L in loans if L["type"] != "SACC" and not L.get("end_day")))),
      metric("AM2022", "SACC Repayments (monthly)", "Loans", "currency", r2(sum(L["repay"] * (26/12 if L["every"] == 14 else 1) for L in act("SACC")))),
      metric("AM2055", "MACC Repayments (monthly)", "Loans", "currency", r2(sum(L["repay"] * (26/12 if L["every"] == 14 else 1) for L in act("MACC")))),
      metric("AM2056", "AOCC Repayments (monthly)", "Loans", "currency", r2(sum(L["repay"] * (26/12 if L["every"] == 14 else 1) for L in act("AOCC")))),
      metric("AM2158", "BNPL Repayments (monthly)", "Loans", "currency", r2(sum(B["repay"] * (26/12 if B["every"] == 14 else 1) for B in p["bnpl"]))),
      metric("AM2117", "SACC Providers", "Loans", "string_array", [{"provider": L["provider"], "credit_deposit": None} for L in loans if L["type"] == "SACC"]),
      metric("AM2120", "MACC Providers", "Loans", "string_array", [{"provider": L["provider"], "credit_deposit": None} for L in loans if L["type"] == "MACC"]),
      metric("AM2123", "AOCC Providers", "Loans", "string_array", [{"provider": L["provider"], "credit_deposit": None} for L in loans if L["type"] == "AOCC"]),
    ]
    dd_items = window(tx, 90, dd); dish_items = window(tx, 90, dish)
    m.append(metric("AM2032", "Dishonours % of Direct Debits", "Risk Percentages", "percentage",
                    {str(pd): r2(len(window(tx, min(pd, D), dish)) / max(1, len(window(tx, min(pd, D), dd))) * 100) for pd in PERIODS}))
    bals = [e["balance"] for e in eod]
    def bstats(n):
        b = bals[-min(n, D):]
        return {"min_amount": r2(min(b)), "max_amount": r2(max(b)), "mean_amount": r2(statistics.mean(b)),
                "median_amount": r2(statistics.median(b)), "range_amount": r2(max(b) - min(b))}
    m.append(metric("AM2161", "Daily End of Day Balance Statistics", "Information", "array", {str(pd): bstats(pd) for pd in PERIODS}))
    m.append(metric("AM2019", "Daily End of Day Balance", "Information", "time_series", eod))
    m.append(metric("AM2177", "Days Overdrawn", "Risk", "array", {str(pd): {"account_balance_overdrawn": sum(1 for b in bals[-min(pd, D):] if b < 0)} for pd in PERIODS}))
    m.append(metric("AM2066", "Days Overdrawn %", "Risk Percentages", "percentage", r2(sum(1 for b in bals[-min(90, D):] if b < 0) / min(90, D) * 100)))
    # AM2151 category monthly means
    cats = []
    for cid, c in CATEGORIES.items():
        if c["type"] == "income": continue
        s30 = sum(abs(t["amount"]) for t in window(tx, min(30, D), lambda t, cid=cid: t["category"] == cid and t["amount"] < 0))
        s90 = sum(abs(t["amount"]) for t in window(tx, min(90, D), lambda t, cid=cid: t["category"] == cid and t["amount"] < 0))
        if s90:
            cats.append({"category_name": c["name"], "category_id": c["talefin_category_id"], "tippla_category": cid,
                         "monthly_mean_30_days": r2(s30 / min(30, D) * 365 / 12), "monthly_mean_90_days": r2(s90 / min(90, D) * 365 / 12)})
    m.append(metric("AM2151", "Debit Transaction Categories Monthly Mean", "Expenses", "array", cats))
    # sensitive flags: present in fixture so the app can prove it never renders them
    for code, name in [("AM2017","Insolvency Present"),("AM2018","Budget Management Service"),("AM2064","Public Trustee"),
                       ("AM2092","Financial Counsellor Service"),("AM2093","Dependents Present"),("AM2062","High Risk Centrelink"),
                       ("AM2091","Debt Collection Present"),("AM2063","Charge Off Present")]:
        m.append(metric(code, name, "Risk", "boolean", code == "AM2093" and pid == "marcus"))
    return {
      "version": "2.0", "application_id": f"APP-{pid.upper()}-0925", "vendor_specific_id": f"VS-{p['seed']}0925",
      "timestamp": f"{AS_OF.isoformat()}T09:12:00+10:00",
      "_note": "Mock TaleFin bank statement analysis. Shapes follow the Tippla Portal Product Spec v2.0; every value is computed from transactions.json. Only the metrics the portal uses are included (the real response has 139).",
      "metrics": m,
      "profiles": [{"full_name": p["profile"]["full_name"].upper(), "bank": {"name": "CBA"},
                    "accounts": [{"id": 1, "nickname": "Smart Access", "bsb": "062-XXX", "number": "XXXX 4821",
                                  "balance": eod[-1]["balance"], "available": r2(eod[-1]["balance"] + 0),
                                  "_note": "BSB/number masked in fixtures. The app must never display or log full account numbers."}]}],
    }

def build_score(pid, p):
    s = p["score"]
    resp = {
      "score": {"SCORE": s["SCORE"], "OVERRIDE": s["override"]["OVERRIDE"] if s["override"] else None,
                "RISK_GRADE": s["RISK_GRADE"], "OVERRIDE_SCORE": s["override"]["OVERRIDE_SCORE"] if s["override"] else None},
      "metadata": {"BANKS_REFERENCE": 2458 + p["seed"], "SCORED_DATETIME": f"{AS_OF.isoformat()} 09:14:03", "BUREAU_REFERENCE": None},
      "score_breakdown": s["breakdown"], "Consumer": {"FULL_NAME": p["profile"]["full_name"]},
      "score_id": f"{pid}{'0'*(8-len(pid))}af4e418c86807592833f{p['seed']:02d}",
    }
    hist = []
    for k, v in enumerate(s["prev"] + ([s["SCORE"]] if s["SCORE"] else [])):
        n = len(s["prev"]) - k
        hist.append({"scored_date": (AS_OF - timedelta(days=14 * n)).isoformat(), "score": v})
    return resp, {"_note": "Tippla-stored history: one TaleFin Score per bank-statement refresh (fortnightly). TaleFin does not return history; Tippla must persist each score_id and result.", "history": hist}

def derived(pid, p, tx):
    """Tippla-computed values (NOT from TaleFin): pay cycle and upcoming bills."""
    last_wage = max(t["date"] for t in tx if t["subcategory"] == "wages" and t["status"] == "posted")
    cyc_start = date.fromisoformat(last_wage); cyc_end = cyc_start + timedelta(days=13)
    rec = {}
    for t in tx:
        if t["is_recurring"] and t["amount"] < 0 and t["status"] == "posted":
            rec.setdefault(t["merchant"], []).append(t)
    upcoming = []
    for mname, items in rec.items():
        items.sort(key=lambda t: t["date"])
        if len(items) < 2: continue
        gap = (date.fromisoformat(items[-1]["date"]) - date.fromisoformat(items[-2]["date"])).days
        nxt = date.fromisoformat(items[-1]["date"]) + timedelta(days=gap)
        if AS_OF < nxt <= cyc_end + timedelta(days=14):
            upcoming.append({"date": nxt.isoformat(), "merchant": mname, "expected_amount": abs(items[-1]["amount"]),
                             "category": items[-1]["category"], "confidence": "predicted", "cadence_days": gap})
    upcoming.sort(key=lambda u: u["date"])
    subs = sorted({t["merchant"]: {"merchant": t["merchant"], "amount": abs(t["amount"]), "last_charged": t["date"], "cadence": "monthly"}
                   for t in tx if t["category"] == "subscriptions"}.values(), key=lambda s: -s["amount"])
    return {"_note": "Tippla-derived from transactions (not TaleFin metrics). Recurring detection and bill prediction are Tippla logic.",
            "as_of": AS_OF.isoformat(), "pay_cycle": {"start": cyc_start.isoformat(), "end": cyc_end.isoformat(), "next_payday": (cyc_end + timedelta(days=1)).isoformat()},
            "upcoming_bills": upcoming, "subscriptions": subs}

def main():
    os.makedirs(OUT, exist_ok=True)
    index = {"as_of": AS_OF.isoformat(), "personas": []}
    for pid, p in PERSONAS.items():
        d = os.path.join(OUT, pid); os.makedirs(d, exist_ok=True)
        start, tx, eod = build(pid, p)
        files = {
          "profile.json": {**p["profile"], "id": pid, "data_from": start.isoformat(), "data_days": p["days"]},
          "transactions.json": {"as_of": AS_OF.isoformat(), "transactions": tx},
          "talefin_bank_statement.json": build_talefin(pid, p, start, tx, eod),
          "derived.json": derived(pid, p, tx),
        }
        files["offers.json"] = {"_note": "Mock lender offers. Only shown when lender-matching consent is on. Lender names are fictional.",
            "lender_matching_consent": pid == "marcus",
            "offers": ([{"id": "off_001", "lender": "Harbour Lending (sample)", "amount": 2000, "term_weeks": 52,
                         "comparison_rate_pct": 21.9, "establishment_fee": 150, "repayment_per_fortnight": 88.46,
                         "total_repayable": 2300.0, "matched_on": ["Income steady for 6 months", "No failed payments in 90 days", "One fewer open loan than 3 months ago"],
                         "expires": None}] if pid == "marcus" else [])}
        files["consents.json"] = {"consents": [
            {"id": "ff_data_sharing", "label": "Share my Friendly Finance application with Tippla", "required": True, "granted": True, "granted_at": "2026-03-28T19:42:10+11:00", "version": "1.2"},
            {"id": "talefin_bank_data", "label": "Let Tippla read my bank data through TaleFin", "required": True, "granted": True, "granted_at": "2026-03-28T19:42:10+11:00", "version": "1.2"},
            {"id": "lender_matching", "label": "Show my profile to partner lenders when I might qualify", "required": False, "granted": pid == "marcus", "granted_at": "2026-03-28T19:42:10+11:00" if pid == "marcus" else None, "version": "1.2"}]}
        sc, hist = build_score(pid, p)
        files["talefin_score.json"] = sc; files["score_history.json"] = hist
        for fn, obj in files.items():
            with open(os.path.join(d, fn), "w") as f: json.dump(obj, f, indent=2)
        index["personas"].append({"id": pid, "name": p["profile"]["full_name"], "state_under_test": p["profile"]["story"],
                                  "score": p["score"]["SCORE"], "override": p["score"]["override"], "transactions": len(tx)})
    with open(os.path.join(OUT, "index.json"), "w") as f: json.dump(index, f, indent=2)
    print(json.dumps(index, indent=2))

if __name__ == "__main__":
    main()
