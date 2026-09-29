# 00 — Architecture Overview (Aura Store)

## 1. Executive Summary
**Aura Store** is an enterprise-grade, serverless digital goods reseller platform designed for the Myanmar market. It connects Myanmar end-users paying in **Myanmar Kyat (MMK)** via local payment methods (KPay, WavePay) to upstream international digital subscription providers via REST APIs.

The entire system is engineered to run on **100% Free Tier infrastructure (Vercel + Supabase)** without maintaining persistent servers or incurring monthly cloud bills.

---

## 2. System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT TIER                                      |
|                                                                                   |
|   +--------------------------+                     +--------------------------+   |
|   |  Myanmar Customer        |                     |  Store Administrator     |   |
|   |  (Telegram Mobile/Desktop|                     |  (Web Admin Dashboard)   |   |
|   +------------+-------------+                     +------------+-------------+   |
+----------------|------------------------------------------------|-----------------+
                 | HTTPS Webhook Updates                          | HTTPS (Next.js SSR/Client)
                 v                                                v
+-----------------------------------------------------------------------------------+
|                             VERCEL SERVERLESS APP                                 |
|                                                                                   |
|   +---------------------------------------------------------------------------+   |
|   |  Next.js 14/15 App Router (Edge / Node.js Serverless Runtime)             |   |
|   |                                                                           |   |
|   |   +-----------------------+     +-------------------------------------+   |   |
|   |   | Telegram Webhook API  |     | Admin API & Server Actions          |   |   |
|   |   | (/api/webhook)        |     | (/api/admin/*)                      |   |   |
|   |   |  - grammY Bot Engine  |     |  - Catalog Sync                     |   |   |
|   |   |  - Message Router     |     |  - Slip Approval                    |   |   |
|   |   |  - Inline Keyboards   |     |  - Settings & Pricing Mutation      |   |   |
|   |   +-----------+-----------+     +------------------+------------------+   |   |
|   |               |                                    |                      |   |
|   |               +------------------+-----------------+                      |   |
|   |                                  |                                        |   |
|   |                                  v                                        |   |
|   |                     +--------------------------+                          |   |
|   |                     | Upstream API Client      |                          |   |
|   |                     | (lib/upstream.ts)        |                          |   |
|   |                     +------------+-------------+                          |   |
|   +----------------------------------|----------------------------------------+   |
+--------------------------------------|--------------------------------------------+
                                       |                                             
                    +------------------+------------------+                         
                    |                                     |                         
                    v                                     v                         
+---------------------------------------+   +---------------------------------------+
|          DATABASE TIER                |   |          UPSTREAM PARTNER TIER        |
|                                       |   |                                       |
|  Supabase (PostgreSQL 15+)            |   |  Partner API Service                  |
|   - Users (MMK Balances)              |   |   - Live Account Catalog              |
|   - Orders & Delivery Lines           |   |   - Automated Fulfillment Engine      |
|   - Slips (KPay/Wave Txns)            |   |   - Instant Delivery Code Dispatch    |
|   - Products (MMK Custom Pricing)     |   |   - Partner Wallet Deductions (USD)   |
+---------------------------------------+   +---------------------------------------+
```

---

## 3. Core Subsystems

### A. Telegram Webhook Bot Engine
* **Execution Model:** Unlike traditional long-polling bots that require an active 24/7 background process, Aura Store leverages Telegram Webhooks. Telegram directly invokes Vercel Serverless HTTP endpoints upon incoming user messages.
* **Cold-start Optimization:** Lightweight grammY framework with zero unnecessary middleware ensures sub-500ms response times.
* **State Management:** Stateless interaction with callback queries carrying payload IDs; persistent user profiles and shopping carts managed in Supabase.

### B. Dynamic Pricing & Currency Converter Engine
* Upstream products are priced in **USD ($)**.
* Aura Store maintains an adjustable **Exchange Rate** (e.g., 1 USD = 4,800 MMK) and **Profit Margin Percentage** (e.g., +25%).
* The pricing engine recalculates live product display rates:
  $$\text{Price}_{\text{MMK}} = \lceil \text{Price}_{\text{USD}} \times \text{Rate} \times (1 + \text{Margin}) \rceil_{100}$$
* Optional **Fixed Custom Price** per item overrides automated conversion when specific promotional pricing is desired.

### C. Automated Order & Delivery Fulfillment
1. User clicks **Buy Now** in Telegram.
2. System verifies user MMK balance atomically.
3. System invokes Upstream `POST /orders` with an idempotent `externalOrderId`.
4. Upstream delivers activation credentials/links in `delivery.lines[]`.
5. System deducts user MMK balance, records the order in PostgreSQL, and dispatches credentials to the user via Telegram formatted message in under 2 seconds.

### D. Manual Slip & Top-Up Processing Desk
* Users upload KPay / WavePay transaction screenshots via the bot.
* Admins receive instant notification in the Web Dashboard.
* Admin verifies the transaction and clicks **Approve**, automatically crediting the user's MMK wallet and notifying the user on Telegram.
