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

# Tippla category taxonomy mapped to TaleFin AM2151 debit category ids (real ids, from a production
# response; see scripts/talefin_catalogue.json). TaleFin has 56 debit categories, some of them parents
# (Debit 2, Fixed 5, Variable 6, Risk 4, Loans 8, Other Debit 140). Tippla groups them as below.
CATEGORIES = {
    "housing":      {"name": "Rent & housing",   "type": "essential", "talefin_category_id": 9},    # Rent (35 = Accommodation)
    "groceries":    {"name": "Groceries",        "type": "essential", "talefin_category_id": 21},
    "food":         {"name": "Food & dining",    "type": "lifestyle", "talefin_category_id": 22},   # Eating Place
    "transport":    {"name": "Transport",        "type": "essential", "talefin_category_id": 15},
    "bills":        {"name": "Bills & utilities","type": "essential", "talefin_category_id": 7},    # Utilities
    "subscriptions":{"name": "Subscriptions",    "type": "lifestyle", "talefin_category_id": 37},   # Subscription Services
    "entertainment":{"name": "Entertainment",    "type": "lifestyle", "talefin_category_id": 58},   # Leisure
    "alcohol":      {"name": "Alcohol",          "type": "lifestyle", "talefin_category_id": 23},
    "gambling":     {"name": "Gambling",         "type": "lifestyle", "talefin_category_id": 30},
    "health":       {"name": "Health",           "type": "essential", "talefin_category_id": 52},   # Medical
    "shopping":     {"name": "Shopping",         "type": "lifestyle", "talefin_category_id": 13},   # Retail
    "loan_repayment":{"name": "Loan repayments", "type": "essential", "talefin_category_id": 8},    # Loans (SACC 19 / Non SACC 20)
    "bnpl":         {"name": "Buy now, pay later","type": "essential","talefin_category_id": 69},
    "wage_advance": {"name": "Pay advances",     "type": "essential", "talefin_category_id": 71},
    "cash":         {"name": "Cash withdrawals", "type": "lifestyle", "talefin_category_id": 70},   # ATM Withdrawals
    "fees":         {"name": "Bank fees",        "type": "essential", "talefin_category_id": 29},   # Fees (Dishonour Fees 50)
    "income":       {"name": "Income",           "type": "income",    "talefin_category_id": None},
}
CATALOGUE = json.load(open(os.path.join(os.path.dirname(__file__), "talefin_catalogue.json")))

PERSONAS = {
 "jess": {
   "profile": {"first_name": "Jess", "full_name": "Jess Taylor", "age": 31, "state": "NSW",
               "postcode": "2150", "email": "jess.taylor@example.com", "mobile": "0412 345 678",
               "tier": "standard", "story": "Hospitality shift worker, paid fortnightly. Declined by Friendly Finance for $2,500. Score slipping: a pay advance every fortnight since late August, and gambling deposits up since April."},
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

def ts(d):
    """TaleFin timestamps carry an offset: +10:00 (AEST) or +11:00 (AEDT, from 04/10/2026 in NSW/VIC)."""
    d = date.fromisoformat(d) if isinstance(d, str) else d
    dst = date(2026, 10, 4) <= d < date(2027, 4, 4) or d < date(2026, 4, 5)
    return f"{d.isoformat()}T10:00:00{'+11:00' if dst else '+10:00'}"

EMPTY_AGG = {"sum_amount": None, "min_amount": None, "max_amount": None, "mean_amount": None, "monthly_mean_amount": None,
             "trimmed": None, "trimmed_monthly": None, "days_since_last": None, "days_since_first": None, "count": None,
             "earliest": None, "latest": None, "date_range_in_days": None}

def agg(items, period_days):
    """Real TaleFin: monthly_mean = sum / (period / 30), whatever history exists (so thin files understate)."""
    amts = [abs(t["amount"]) for t in items]
    if not amts:
        return dict(EMPTY_AGG)
    ds = sorted(t["date"] for t in items)
    monthly = r2(sum(amts) / (period_days / 30))
    return {"sum_amount": r2(sum(amts)), "min_amount": r2(min(amts)), "max_amount": r2(max(amts)),
            "mean_amount": r2(statistics.mean(amts)), "monthly_mean_amount": monthly,
            "trimmed": r2(statistics.mean(amts)), "trimmed_monthly": monthly,
            "days_since_last": (AS_OF - date.fromisoformat(ds[-1])).days, "days_since_first": (AS_OF - date.fromisoformat(ds[0])).days,
            "count": len(amts), "earliest": ts(ds[0]), "latest": ts(ds[-1]),
            "date_range_in_days": (date.fromisoformat(ds[-1]) - date.fromisoformat(ds[0])).days + 1}

MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

def months_back():
    for k in range(12):
        y, m = AS_OF.year, AS_OF.month - k
        while m <= 0: m += 12; y -= 1
        yield k, y, m

def monthly(tx, pred):
    out = {}
    for k, y, m in months_back():
        items = [t for t in tx if t["status"] == "posted" and pred(t) and t["date"][:7] == f"{y}-{m:02d}"]
        v = agg(items, 30) if items else {**EMPTY_AGG, "sum_amount": 0}
        out[str(k)] = {"month": MONTHS[m - 1], "year": y, **v}
    return out

def metric(code, value, fmt=None):
    c = CATALOGUE["metrics"][code]
    return {"code": code, "name": c["name"], "friendly_name": c["name"], "value": value, "format": fmt or c["format"],
            "cluster_visibility": "all", "group_name": c["group_name"]}

def arr_metric(code, tx, pred, days_avail=None):
    v = {str(pd): agg(window(tx, pd, pred), pd) for pd in PERIODS}
    v["monthly_values"] = monthly(tx, pred)
    return metric(code, v)

def pct_metric(code, num_pred, den_pred, tx):
    def pct(items_n, items_d):
        n = sum(abs(t["amount"]) for t in items_n); dd = sum(abs(t["amount"]) for t in items_d)
        return r2(n / dd * 100) if dd else None
    v = {str(pd): pct(window(tx, pd, num_pred), window(tx, pd, den_pred)) for pd in PERIODS}
    v["monthly_values"] = {}
    for k, y, m in months_back():
        mon = lambda t, y=y, m=m: t["status"] == "posted" and t["date"][:7] == f"{y}-{m:02d}"
        v["monthly_values"][str(k)] = {"month": MONTHS[m - 1], "year": y,
            "value": pct([t for t in tx if mon(t) and num_pred(t)], [t for t in tx if mon(t) and den_pred(t)])}
    return metric(code, v)

def flag_metric(code, present):
    v = {str(pd): present for pd in PERIODS}
    v["monthly_values"] = {str(k): {"month": MONTHS[m - 1], "year": y, "value": present} for k, y, m in months_back()}
    return metric(code, v)

def build_talefin(pid, p, start, tx, eod):
    """A TaleFin bank statement 'summary' response, shaped like production (see scripts/talefin_catalogue.json)."""
    D = p["days"]
    inc = lambda t: t["category"] == "income"
    wage = lambda t: t["subcategory"] == "wages"
    cl = lambda t: t["subcategory"] == "centrelink"
    deb = lambda t: t["amount"] < 0
    gam = lambda t: t["category"] == "gambling"
    living = lambda t: t["category"] in ("groceries", "food", "transport", "bills", "health")
    loanr = lambda t: t["category"] == "loan_repayment"
    sacc_d = lambda t: loanr(t) and t["subcategory"] == "sacc"
    macc_d = lambda t: loanr(t) and t["subcategory"] == "macc"
    aocc_d = lambda t: loanr(t) and t["subcategory"] == "aocc"
    wa_c = lambda t: t["subcategory"] == "advance_credit"
    wa_d = lambda t: t["subcategory"] == "advance_repayment"
    bnpl = lambda t: t["category"] == "bnpl"
    dish = lambda t: t["subcategory"] == "dishonour"
    atm = lambda t: t["category"] == "cash"
    dd = lambda t: t["is_recurring"] and t["amount"] < 0
    none = lambda t: False
    pend = [t for t in tx if t["status"] == "pending"]
    loans = p["loans"]
    act = lambda typ: [L for L in loans if L["type"] == typ and not L.get("end_day")]
    monthly_repay = lambda Ls: r2(sum(L["repay"] * (26 / 12 if L["every"] == 14 else 1) for L in Ls)) if Ls else None
    # A dishonour is the bounced repayment itself (TaleFin reports its amount); the fee is a separate debit.
    nimble = next((L for L in loans if L["provider"] == "Nimble"), None)
    bounced = [{"date": t["date"], "amount": -(nimble["repay"] if nimble else 15.0), "status": "posted"} for t in tx if dish(t)]

    m = [
      arr_metric("AM2001", tx, wage), arr_metric("AM2002", tx, cl),
      arr_metric("AM2003", tx, lambda t: t["amount"] > 0), arr_metric("AM2004", tx, deb),
      arr_metric("AM2005", tx, gam), arr_metric("AM2008", tx, living),
      arr_metric("AM2010", tx, lambda t: t["category"] == "housing"),
      arr_metric("AM2011", bounced, lambda t: True), arr_metric("AM2059", bounced, lambda t: True),
      arr_metric("AM2012", tx, lambda t: t["amount"] > 0 and not inc(t)), arr_metric("AM2013", tx, dd),
      arr_metric("AM2015", tx, none), arr_metric("AM2020", tx, atm), arr_metric("AM2072", tx, inc),
      arr_metric("AM2128", tx, bnpl), arr_metric("AM2138", tx, wa_c), arr_metric("AM2139", tx, wa_d),
      arr_metric("AM2087", tx, wa_d),
      arr_metric("AM2040", tx, none), arr_metric("AM2041", tx, none), arr_metric("AM2042", tx, none),
      arr_metric("AM2044", tx, sacc_d), arr_metric("AM2045", tx, macc_d), arr_metric("AM2046", tx, aocc_d),
      arr_metric("AM2047", tx, none), arr_metric("AM2113", tx, none), arr_metric("AM2197", tx, none),
      arr_metric("AM2067", pend, lambda t: True),
      pct_metric("AM2023", gam, inc, tx), pct_metric("AM2031", gam, inc, tx), pct_metric("AM2033", cl, inc, tx),
      pct_metric("AM2034", deb, inc, tx), pct_metric("AM2069", lambda t: loanr(t) or bnpl(t) or wa_d(t), inc, tx),
    ]
    # AM2067 counts pending debits, which window() skips; rebuild it from the pending list directly.
    m[[x["code"] for x in m].index("AM2067")] = metric("AM2067", {**{str(pd): agg(pend, pd) for pd in PERIODS}, "monthly_values": {}})

    last_inc = max(t["date"] for t in tx if inc(t) and t["status"] == "posted")
    last_wage = max(t["date"] for t in tx if wage(t) and t["status"] == "posted")
    next_wage = date.fromisoformat(last_wage) + timedelta(days=14)
    nexts = [next_wage]
    if p["centrelink"]:
        last_cl = max(t["date"] for t in tx if cl(t) and t["status"] == "posted")
        nexts.append(date.fromisoformat(last_cl) + timedelta(days=14))
    wage_amts = [t["amount"] for t in window(tx, 90, wage)]
    irregular = (statistics.pstdev(wage_amts) / statistics.mean(wage_amts)) > 0.05 if len(wage_amts) > 1 else False
    m += [
      metric("AM2163", p["wage"]["employer"].replace(" PTY", "")),
      metric("AM2101", "Wages"),
      metric("AM2038", True),
      metric("AM2021", (AS_OF - date.fromisoformat(last_inc)).days),
      metric("AM2074", (AS_OF - date.fromisoformat(last_wage)).days),
      metric("AM2035", ts(start)),
      metric("AM2037", ts(min(nexts))),   # next income of any kind on the primary account
      metric("AM2077", ts(next_wage)),    # next wages
      flag_metric("AM2110", irregular),
      flag_metric("AM2025", bool(act("SACC"))), flag_metric("AM2026", bool(act("MACC"))), flag_metric("AM2027", bool(act("AOCC"))),
      metric("AM2172", len(act("SACC"))), metric("AM2173", len(act("MACC"))), metric("AM2174", len(act("AOCC"))),
      metric("AM2175", 1 if p["wage_advance"] else 0),
      # Outstanding = recent loan deposit − repayments since (TaleFin's own definition); class totals only.
      metric("AM2024", r2(sum(L["balance"] for L in act("SACC")))),
      metric("AM2132", r2(sum(L["balance"] for L in loans if L["type"] != "SACC" and not L.get("end_day"))) or None),
      metric("AM2022", monthly_repay(act("SACC"))), metric("AM2116", monthly_repay(act("SACC"))),
      metric("AM2055", monthly_repay(act("MACC"))), metric("AM2119", monthly_repay(act("MACC"))),
      metric("AM2056", monthly_repay(act("AOCC"))), metric("AM2122", monthly_repay(act("AOCC"))),
      metric("AM2158", r2(sum(B["repay"] * (26 / 12 if B["every"] == 14 else 1) for B in p["bnpl"])) if p["bnpl"] else None),
      metric("AM2156", r2(p["wage_advance"]["credit"] * 1.05 * 26 / 12) if p["wage_advance"] else None),
      metric("AM2157", r2(p["wage_advance"]["credit"] * 1.05 * 26 / 12) if p["wage_advance"] else None),
      # "Active providers" lists only providers whose LATEST transaction is a loan deposit, so they are
      # usually empty. Provider names come from the status / default / past-due lists instead.
      metric("AM2117", []), metric("AM2120", []), metric("AM2123", []),
      metric("AM2049", [{"provider": L["provider"], "status": "settled" if L.get("end_day") else "active"} for L in loans if L["type"] == "SACC"]),
      metric("AM2105", [{"provider": L["provider"], "defaults": 0} for L in loans if L["type"] == "SACC"]),
      metric("AM2106", [{"provider": L["provider"], "defaults": 0} for L in loans if L["type"] != "SACC"]),
      metric("AM2107", [{"provider": p["wage_advance"]["provider"], "defaults": 0}] if p["wage_advance"] else []),
      metric("AM2125", [{"provider": L["provider"], "defaults": 0} for L in loans if L["type"] == "SACC"]),
      metric("AM2126", [{"provider": L["provider"], "defaults": 0} for L in loans if L["type"] != "SACC"]),
      metric("AM2127", [{"provider": p["wage_advance"]["provider"], "defaults": 0}] if p["wage_advance"] else []),
      metric("AM2030", [p["wage_advance"]["provider"]] if p["wage_advance"] else []),
    ]
    m.append(pct_metric("AM2032", dish, dd, tx))
    bals = [e["balance"] for e in eod]
    def bstats(n):
        b = bals[-min(n, D):]
        return {"min_amount": r2(min(b)), "max_amount": r2(max(b)), "mean_amount": r2(statistics.mean(b)),
                "trimmed_amount": r2(statistics.mean(b)), "median_amount": r2(statistics.median(b)), "range_amount": r2(max(b) - min(b))}
    m.append(metric("AM2161", {str(pd): bstats(pd) for pd in PERIODS}))
    m.append(metric("AM2019", [{"date": ts(e["date"]), "balance": e["balance"]} for e in eod]))
    m.append(metric("AM2177", {str(pd): {"account_balance_overdrawn": sum(1 for b in bals[-min(pd, D):] if b < 0)} for pd in PERIODS}))
    m.append(metric("AM2066", r2(sum(1 for b in bals[-min(90, D):] if b < 0) / min(90, D) * 100)))
    # AM2151: every TaleFin debit category, monthly means over 30 and 90 days (null when none).
    def mean_for(pred, pd):
        s_ = sum(abs(t["amount"]) for t in window(tx, pd, pred))
        return r2(s_ / (pd / 30)) if s_ else None
    by_id = {}
    for cid, c in CATEGORIES.items():
        if c["type"] != "income":
            by_id.setdefault(c["talefin_category_id"], []).append(cid)
    special = {2: deb, 19: sacc_d, 20: lambda t: macc_d(t) or aocc_d(t), 50: dish}
    cats = []
    for c in CATALOGUE["debit_categories"]:
        cid = c["category_id"]
        if cid in special: pred = special[cid]
        elif cid in by_id: pred = lambda t, ids=by_id[cid]: t["category"] in ids and t["amount"] < 0 and not dish(t)
        else: pred = none
        cats.append({**c, "monthly_mean_30_days": mean_for(pred, 30), "monthly_mean_90_days": mean_for(pred, 90)})
    m.append(metric("AM2151", cats))
    credit_pred = {36: wage, 45: cl, 40: inc, 3: lambda t: t["amount"] > 0 and not inc(t)}
    m.append(metric("AM2152", [{**c, "monthly_mean_30_days": mean_for(credit_pred.get(c["category_id"], none), 30),
                                     "monthly_mean_90_days": mean_for(credit_pred.get(c["category_id"], none), 90)}
                                for c in CATALOGUE["credit_categories"]]))
    # Sensitive flags: present in the fixture so the app can prove it never renders them.
    for code in ["AM2017", "AM2018", "AM2064", "AM2092", "AM2093", "AM2062", "AM2091", "AM2063"]:
        m.append(flag_metric(code, code == "AM2093" and pid == "marcus"))

    prof = p["profile"]
    seed = p["seed"]
    bal = f"{eod[-1]['balance']:.4f}"
    return {
      "version": "2.0", "application_id": 39440000 + seed, "type": "summary", "id": 39440000 + seed,
      "vendor_specific_id": f"VS-{seed}0925", "timestamp": f"{AS_OF.isoformat()}T09:12:00.000Z",
      "_note": ("Mock TaleFin bank statement 'summary' response, shaped like production: timestamps with offsets, month names, "
                "string balances, UNMASKED fictional account numbers and holder details (so the app's masking is tested). "
                "Only the metrics the portal uses are included (production has 139). Values are computed from transactions.json."),
      "metrics": m,
      "profiles": [{
        "id": 1000 + seed, "timestamp": f"{AS_OF.isoformat()}T09:10:00.000Z",
        "full_name": prof["full_name"].upper(), "owner": prof["full_name"].upper(), "email": prof["email"],
        "bank": {"id": 1, "name": "CBA", "slug": "cba", "country_code": "AU", "institution_type": "banking"},
        "application": {"id": 39440000 + seed, "full_name": prof["full_name"], "email": prof["email"], "mobile": prof["mobile"].replace(" ", ""),
                        "finalised": True, "analysed": True},
        "accounts": [{
          "id": 100280000 + seed, "nickname": "Smart Access", "available": bal, "balance": bal,
          "bsb": f"062{seed:03d}", "number": f"1024{4814 + seed:04d}",
          "type": "TRANSACTION", "type_display": "Transaction", "transactions_num": len([t for t in tx if t["status"] == "posted"]),
          "account_json": {"dob": "", "name": prof["full_name"].upper(), "type": "individual", "gender": "", "openDate": ""},
          "account_owner_info": {"owners": [prof["full_name"].upper()], "address": [{"state": prof["state"], "postCode": prof["postcode"],
                                 "streetName": "Sample", "streetType": "St", "townSuburb": "Sample", "streetNumber": "1"}]},
          "metrics": {"debits": {"sum": f"{-sum(abs(t['amount']) for t in tx if t['amount'] < 0 and t['status'] == 'posted'):.4f}"},
                      "credits": {"sum": f"{sum(t['amount'] for t in tx if t['amount'] > 0 and t['status'] == 'posted'):.4f}"}},
        }],
        "is_cdr": False,
      }],
      "is_cdr": False,
      "report_period": {"start_date": start.isoformat(), "end_date": AS_OF.isoformat(), "days_requested": D},
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
    # The pay cycle starts at the first regular income (wages OR Centrelink) in the fortnight that
    # ends with the latest wage, so Centrelink paid the day before wages counts in the same cycle.
    last_wage = date.fromisoformat(max(t["date"] for t in tx if t["subcategory"] == "wages" and t["status"] == "posted"))
    regular = [date.fromisoformat(t["date"]) for t in tx if t["subcategory"] in ("wages", "centrelink") and t["status"] == "posted"]
    cyc_start = min(d for d in regular if last_wage - timedelta(days=6) <= d <= last_wage)
    cyc_end = cyc_start + timedelta(days=13)
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
            "offers": ([{"id": "off_001", "lender": "Harbour Lending (sample)", "amount": 2500, "term_weeks": 78,
                         "comparison_rate_pct": 21.9, "establishment_fee": 150, "repayment_per_fortnight": 75.47,
                         "total_repayable": 2943.33, "_fee_note": "Establishment fee is included in the repayments; 39 x $75.47 = $2,943.33, comparison rate 21.9% (medium loan, not a SACC)", "matched_on": ["Income steady for 6 months", "No failed payments in 90 days", "One fewer open loan than 3 months ago"],
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
