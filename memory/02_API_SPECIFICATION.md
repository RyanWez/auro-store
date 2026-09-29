# 02 — API Specification & Partner Integration

## 1. Upstream Partner API Reference

* **Base URL:** `http://paid2.daki.cc:4153/api/partner/v1`
* **Authentication Header:** `Authorization: Bearer <sk_live_...>`
* **Data Format:** JSON (UTF-8)

---

### Endpoint Catalog

#### A. Health Check
* `GET /health` (No authentication required)
* **Response:** `200 OK`

#### B. Check Partner Balance
* `GET /balance`
* **Response:**
```json
{
  "ok": true,
  "balance": "1.00",
  "currency": "USD",
  "userId": 8777968077
}
```

#### C. Get Categories
* `GET /catalog/categories`
* **Response:**
```json
{
  "ok": true,
  "data": [
    { "categoryId": 10, "name": "GEMINI AI" },
    { "categoryId": 25, "name": "CHAT GPT" },
    { "categoryId": 2,  "name": "CAPCUT" }
  ]
}
```

#### D. Get Products List
* `GET /catalog/products?inStock=true&limit=100&offset=0`
* **Response:**
```json
{
  "ok": true,
  "data": [
    {
      "productId": 50,
      "name": "Claude $100 API Key 1 Month",
      "description": "Valid for 30 Days...",
      "categoryId": 39,
      "deliveryType": "TEXT",
      "price": 3.0,
      "yourPrice": 3.0,
      "discountPct": 0,
      "currency": "USD",
      "stock": 5,
      "inStock": true
    }
  ]
}
```

#### E. Create Order (Instant Delivery)
* `POST /orders`
* **Headers:** `Content-Type: application/json`, `Authorization: Bearer <API_KEY>`
* **Request Body:**
```json
{
  "productId": 50,
  "quantity": 1,
  "externalOrderId": "aura_ord_1729012398_42"
}
```
* **Success Response (200 OK):**
```json
{
  "ok": true,
  "order": {
    "orderId": 5892,
    "externalOrderId": "aura_ord_1729012398_42",
    "productId": 50,
    "productName": "Claude $100 API Key 1 Month",
    "quantity": 1,
    "unitPrice": 3.0,
    "total": 3.0,
    "currency": "USD",
    "status": "COMPLETED"
  },
  "delivery": {
    "type": "TEXT",
    "lines": [
      "sk-ant-api03-xxxx-yyyy-zzzz"
    ]
  },
  "balanceAfter": "0.70"
}
```

---

## 2. Internal Serverless API Endpoints (Next.js)

### A. Telegram Bot Webhook
* **Route:** `POST /api/webhook`
* **Handler:** Serverless grammY webhook adapter.
* **Security:** Optional Telegram secret token verification (`x-telegram-bot-api-secret-token`).

### B. Catalog & Balance Sync
* **Route:** `POST /api/admin/sync`
* **Function:** Pulls updated catalog and stock counts from upstream, updates PostgreSQL database, and recalculates MMK prices using configured exchange rates.

### C. Slip Review & Approval
* **Route:** `POST /api/admin/slips`
* **Request Body:**
```json
{
  "slipId": 12,
  "action": "APPROVE", // or "REJECT"
  "amountMmk": 5000,
  "note": "KPay Txn Verified"
}
```
* **Effect:** Credits customer's MMK wallet balance in PostgreSQL and sends an instant Telegram message: `✅ သင်၏ 5,000 Ks ငွေဖြည့်သွင်းမှု အောင်မြင်ပါသည်!`.

### D. Settings & Pricing Configuration
* **Route:** `PUT /api/admin/settings`
* **Request Body:**
```json
{
  "usd_exchange_rate": "4850",
  "profit_margin_pct": "25",
  "kpay_phone": "09123456789"
}
```
