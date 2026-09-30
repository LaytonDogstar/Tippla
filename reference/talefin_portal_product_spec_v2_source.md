# Source: Tippla Portal Product Spec v2.0 (April 2026) — summary

This is the original TaleFin → portal mapping (Google Doc "Tippla_Portal_Product_Spec_v2.docx"). **`docs/06_data_mapping.md` supersedes it** — it keeps every mapping below and adds data-use classes and corrections. Kept here so Claude Code can see what the original said.

- Root keys: `version`, `application_id`, `timestamp`, `metrics[]` (139 metrics, AM2001–AM2197), `profiles[]`, `profiles[].accounts[]`.
- Period keys: `value.14/30/60/90/180/365`, `value.monthly_values` (keys 0–11, 0 = current month).
- Income: AM2072 total, AM2001 wages, AM2164 primary wage, AM2002 Centrelink, AM2012 other credits, AM2033 Centrelink %. Employment: AM2163 employer, AM2101 income type, AM2038 status, AM2021/AM2074 days since income/wage, AM2077 next pay date, AM2110 irregular wages. Income period fields: sum/min/max/mean/monthly_mean amount, count, days_since_last/first, earliest, latest.
- Spending: AM2004 total debits, AM2008 living, AM2010 housing, AM2136 mortgage, AM2034 withdrawals % income, AM2069 DTI; AM2151 category monthly means (ids: Accommodation 35, Alcohol 23; others "varies").
- Gambling: AM2005 confirmed (sum, count, days_since_last), AM2015 inferred, AM2023 combined % income ("primary risk metric", >10% warning, >20% critical), AM2031 confirmed %, AM2075 % wages, AM2043 % credits, AM2134 gambling on loan day; trends from AM2005/AM2023 monthly_values.
- Loans: AM2025–27 presence; AM2172–75 active counts; AM2024 SACC outstanding; AM2132 non-SACC outstanding; repayments AM2022, AM2055, AM2056, AM2156, AM2158; providers AM2117, AM2120, AM2123; AM2048 distinct SACC; AM2137 wage advance 60 days.
- Wage advance & BNPL: AM2138/AM2139 credits/debits, AM2175 providers (>2 warning), AM2087 DDs, AM2088 dishonours; BNPL AM2128, AM2080, AM2084, AM2085.
- Risk: dishonours AM2011, AM2032 (>5% warning), AM2029, AM2058, AM2059, AM2071; status/default/past due AM2049, AM2105–AM2107, AM2125, AM2126; flags AM2091 debt collection, AM2017 insolvency, AM2018 budget management, AM2064 Public Trustee, AM2092 financial counsellor, AM2063 charge-off, AM2093 dependants, AM2062 high-risk Centrelink.
- Balances: accounts[].balance/.available, AM2068 overdraft limit, AM2161 daily balance stats (min/max/mean/median/range), AM2177 days overdrawn, AM2066 days overdrawn % (>30% warning), AM2019 daily balance series ("green if positive, red if negative").
- Transactions: AM2003 credits, AM2004 debits, AM2013 DDs, AM2016 primary account DDs, AM2020 ATM. Account structure: full_name, bank.name, accounts[].id/nickname/bsb/number/balance/available.
- Credit cards: AM2051 limit, AM2052 utilisation, AM2053 missed %, AM2054 cash advances, AM2057 repayments, AM2050 providers.
- Groups: Income 21, Expenses 12, Loans 33, Risk 26, Risk Percentages 19, Information 22, Credit Cards 6 (= 139). Formats: array, boolean, currency, count, days, date, percentage, string_array.
