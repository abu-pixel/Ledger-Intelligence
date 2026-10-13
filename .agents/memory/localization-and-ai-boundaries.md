---
name: Localization and AI boundaries
description: Product scope and data-handling rules for Ledgerly country settings and AI guidance.
---

Support Ethiopia first, while keeping country and currency selection broad across Africa and international markets. Present tax information outside verified coverage as configurable or unverified, not as legal compliance.

Changing a business country must not silently convert existing ledger amounts or relabel a live book's currency. A currency change is an explicit label change unless a real exchange-rate conversion flow is separately designed and confirmed.

AI use requires explicit user consent. Send only the user's question, country/currency, and aggregate ledger totals; do not send receipts, transaction descriptions, client names, or identifiers. Do not persist chat history by default.

**Why:** the user requested Ethiopia-first coverage at African and international scale; broad tax rules are not verified uniformly, and ledger/AI data can be financially sensitive.

**How to apply:** preserve these boundaries when adding local tax and invoice rules, currency conversion, cloud sync, or richer AI and document-scanning features.
