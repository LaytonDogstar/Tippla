TaleFin Score Endpoint (V2)

*Quick Start reference, extracted from the TaleFin Wiki on 30 September
2026. Source:
wiki.talefin.com/books/talefin-score/page/quick-start-guide-v2*

Overview

The Score endpoint returns a risk score and supporting breakdown for a
consumer, using bank statement data, bureau data, or both, depending on
which identifiers are supplied. V2 changes the method from GET to POST.

| **Item**       | **Detail**                                                                  |
|----------------|-----------------------------------------------------------------------------|
| Output         | score, risk grade, breakdown, metadata, score_id                            |
| Method         | POST                                                                        |
| Authentication | HMAC (same as other Bank Statement endpoints). Bureau endpoints use OAuth2. |

Prerequisites

The application must already have been processed on the relevant
system(s) before calling the endpoint.

- **Bank Statements:** submit and process a bank statement application,
  which returns the vendor_specific_id.

- **Bureau:** lodge a bureau enquiry and capture the returned ENQXXXXXXX
  value (enquiry_reference_number). This is not your internal
  application reference.

Endpoint and environments

| **Environment** | **URL**                                                                  |
|-----------------|--------------------------------------------------------------------------|
| Production      | https://banks.talefin.com/api/v1/score/calculate/{vendor_label}/         |
| Staging         | https://banks-staging.talefin.com/api/v1/score/calculate/{vendor_label}/ |

{vendor_label} is the unique identifier that assigns configuration
parameters and services to a vendor. Use the same label as when
processing new applications.

Request

Header: Content-Type: application/json

| **Field**                | **Required**    | **Description**                                                       |
|--------------------------|-----------------|-----------------------------------------------------------------------|
| vendor_specific_id       | Yes             | Vendor Specific ID from the Bank Statement application.               |
| enquiry_reference_number | If using bureau | Bureau enquiry reference returned during enquiry (format ENQXXXXXXX). |

vendor_specific_id must always be supplied. Integrators using the bureau
must provide both reference numbers.

Example body: both identifiers

{

"vendor_specific_id": "123456789",

"enquiry_reference_number": "ENQXXXXXXX"

}

Example body: bank statements only

{

"vendor_specific_id": "123456789"

}

Example response

{

"score": {

"SCORE": 258,

"OVERRIDE": null,

"RISK_GRADE": "3",

"OVERRIDE_SCORE": null

},

"metadata": {

"BANKS_REFERENCE": 2458,

"SCORED_DATETIME": "2024-12-10 15:25:39",

"BUREAU_REFERENCE": null

},

"score_breakdown": {

"INCOME": 0.4,

"CASH_SPEND": 1.5,

"ADVERSE_SPEND": 3.8,

"MISSED_PAYMENT": 0.4,

"PRODUCTIVE_SPEND": 1.7,

"DISPOSABLE_INCOME": 5.7,

"GOVERNMENT_RELIANCE": 1.2,

"LOAN_AMOUNT_AND_TYPE": 9.8,

"RELIABLE_PAYMENT_HISTORY": null

},

"Consumer": {

"FULL_NAME": "John Citizen"

},

"score_id": "6a7578d8af4e418c86807592833fab8c"

}

**Store score_id.** It is a unique reference shared between TaleFin and
the caller and may be required to download reports later.

Field reference

For all score and breakdown fields, higher is better.

| **Field**                                | **Description**                                                             |
|------------------------------------------|-----------------------------------------------------------------------------|
| score.SCORE                              | Overall risk score (0–1000).                                                |
| score.RISK_GRADE                         | Overall risk grade (0–10).                                                  |
| score.OVERRIDE                           | Override reason if detected. Indicates the score may require manual review. |
| score.OVERRIDE_SCORE                     | Override code (e.g. -999, -998) if applicable.                              |
| metadata.BANKS_REFERENCE                 | Bank Statement Vendor Specific ID used to calculate the score.              |
| metadata.BUREAU_REFERENCE                | Bureau Enquiry Reference used to calculate the score.                       |
| metadata.SCORED_DATETIME                 | Date/time the score was generated.                                          |
| score_breakdown.INCOME                   | Steady income boosts creditworthiness (0–10).                               |
| score_breakdown.CASH_SPEND               | High cash spending affects creditworthiness (0–10).                         |
| score_breakdown.ADVERSE_SPEND            | Risky behaviour signals, e.g. heavy drinking, gambling (0–10).              |
| score_breakdown.MISSED_PAYMENT           | Missed payments, recent behaviour weighted more (0–10).                     |
| score_breakdown.PRODUCTIVE_SPEND         | Constructive / value-generating spending (0–10).                            |
| score_breakdown.DISPOSABLE_INCOME        | How well regular income covers regular expenses (0–10).                     |
| score_breakdown.GOVERNMENT_RELIANCE      | Reliance on government support (0–10).                                      |
| score_breakdown.LOAN_AMOUNT_AND_TYPE     | Type/number of open and recent credit products (0–10).                      |
| score_breakdown.RELIABLE_PAYMENT_HISTORY | Reliability of past payments, recent weighted more (0–10).                  |
| Consumer.FULL_NAME                       | Name of the consumer the score relates to.                                  |
| score_id                                 | Unique reference for report retrieval and support queries.                  |

Override codes

When an override is returned it includes a reason (score.OVERRIDE)
and/or a code (score.OVERRIDE_SCORE).

| **Code** | **Meaning**                                                                             |
|----------|-----------------------------------------------------------------------------------------|
| -999     | Overdue Payments Detected – extreme overdue payments detected on the bureau.            |
| -998     | Thin File Detected – not enough data to provide any score.                              |
| -997     | No Debits or Credits Detected – not enough data to provide an accurate score.           |
| -996     | No Debits Detected – not enough data to provide an accurate score.                      |
| -995     | Unidentified Income Source Detected – client likely did not provide main bank accounts. |

Score simulation and testing

- **Bureau:** high/low examples and matching inputs on the Bureau
  Enquiries wiki page.

- **Bank Statements:** see Bank Statement Test Application Details on
  the wiki.

FAQ / common errors

**Q: A 500 error says my application is not found.**

The banking information must be processed before a score can be
generated. There is no dedicated "score ready" webhook. In most cases
the application.report_ready webhook gives enough lead time. Recommended
approaches:

- Implement a short retry (e.g. retry after 1 second) if the score isn't
  immediately available.

- Alternatively, wait for a later webhook such as
  application.documents_ready, which typically gives ample buffer.

Related documentation

- v1_score (TaleFin Wiki)

- Bank Statements Integration Guide

- Bureau – Getting Started
