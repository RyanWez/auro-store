# Aura Store — AI Agent & Developer Guidelines (AGENTS.md)

Welcome to the **Aura Store** project repository. This document defines the architectural guidelines, conventions, security standards, testing mandates, and step-by-step implementation order for AI agents and developers contributing to this codebase.

---

## 1. Project Mission & Identity
* **Project Name:** Aura Store (Aura Digital Hub)
* **Goal:** A modern, high-performance Telegram Reseller Store tailored for Myanmar customers (MMK currency with KPay/WavePay support) with an integrated Next.js Web Admin Dashboard, fully automated Upstream API fulfillment, and 100% Free deployment architecture on Vercel + Supabase.
* **Branding Guideline:** Never use upstream branding (e.g., xPro). All user-facing interfaces, bots, error messages, and documentation must consistently reflect **Aura Store** branding.

---

## 2. Mandatory Testing Policy (Test-Driven Guidelines) 🧪

Whenever creating or modifying a feature, library module, pricing engine, bot keyboard, or API endpoint, **corresponding test files must be created or updated immediately in the `tests/` directory**:

```
tests/
├── unit/                      # Unit tests for core calculations & clients
│   ├── pricing.test.ts        # Currency conversion & margin ceiling rules
│   ├── upstream.test.ts       # Upstream Partner API client mocks & calls
│   └── validation.test.ts     # Slip & custom quantity validation
├── bot/                       # Telegram Bot UI & flow tests
│   ├── keyboards.test.ts      # Inline Keyboards, Steppers & Grid builders
│   └── handlers.test.ts       # Message & callback routing tests
└── api/                       # API route integration tests
    ├── webhook.test.ts        # Telegram Webhook execution tests
    ├── sync.test.ts           # Upstream catalog synchronization tests
    └── slips.test.ts          # Slip approve/reject & balance credit tests
```

### Testing Rules for AI Agents:
1. **Never commit without matching tests:** If you create `lib/pricing.ts`, you must create `tests/unit/pricing.test.ts`.
2. **Deterministic & Mocked:** External network calls (Telegram API & Upstream API) must be mockable in unit tests so tests can run offline and in CI/CD without consuming upstream balance.
3. **Run Tests:** Ensure `npm test` passes before considering a feature complete.

---

## 3. Core Tech Stack
* **Framework:** Next.js 14/15 (App Router, TypeScript)
* **Telegram Bot Engine:** grammY (`grammy`) running in Serverless Webhook mode (`std/http` handler)
* **Testing Runner:** Vitest (`vitest`)
* **Styling & UI:** Tailwind CSS + Lucide Icons
* **Database & ORM:** Supabase (PostgreSQL) + Prisma ORM
* **Hosting Platform:** Vercel (Frontend + Serverless Bot Webhook + REST API)
* **External Integration:** Upstream Partner REST API (JSON / Bearer Token)

---

## 4. Phased Implementation Roadmap (အဆင့်ဆင့်ရေးသားမည့် အစီအစဉ်)

When proceeding with development, implement in this strict sequence:

### 🔹 Phase 1: Core Foundation & Pricing Engine
1. `lib/pricing.ts` — Dynamic MMK rounding & exchange formula calculation.
2. `lib/upstream.ts` — Upstream API wrapper with error handling and retry mechanism.
3. Matching unit tests in `tests/unit/`.

### 🔹 Phase 2: Database Layer & Atomic Operations
1. `prisma/schema.prisma` — Complete models for User, Order, Product, Slip, Setting.
2. `lib/db/orders.ts` & `lib/db/users.ts` — Atomic transaction helpers for balance debit and idempotent order placement.
3. Matching tests in `tests/unit/`.

### 🔹 Phase 3: Telegram Bot Engine & Interactive Keyboards
1. `bot/keyboards.ts` — Main Menu, Category Matrix, Stepper (`[-] [1] [+]`), Presets (`[1] [5] [10]...`), Custom Quantity, and Buy Now buttons.
2. `bot/handlers.ts` — Command routers (`/start`, `/wallet`, `/orders`, `/support`), callback query dispatcher, and KPay/Wave slip upload listener.
3. `app/api/webhook/route.ts` — Vercel serverless webhook bridge.
4. Matching tests in `tests/bot/` & `tests/api/webhook.test.ts`.

### 🔹 Phase 4: Admin Dashboard & Internal REST APIs
1. `app/api/admin/sync/route.ts` — Upstream catalog sync & auto price recalculation.
2. `app/api/admin/slips/route.ts` — 1-Click Approve/Reject with instant Telegram customer notification.
3. `app/api/admin/settings/route.ts` — USD rate, profit margin, and payment number mutations.
4. Admin UI Pages (`/admin`, `/admin/products`, `/admin/slips`, `/admin/orders`).
5. Matching tests in `tests/api/`.

### 🔹 Phase 5: End-to-End Simulation & Verification
1. Mock full checkout flow from Telegram `/start` -> Browse -> Select Qty -> Buy -> Deduct MMK -> Call Upstream -> Receive Keys -> Customer Dispatch.
2. Run full test suite (`npm test`).

---

## 5. Key Engineering Conventions & Safety Rules

### A. Idempotency & Transaction Safety
1. **Never double-charge users:** All balance deductions and order creations must be executed inside a single `prisma.$transaction([...])`.
2. **Deterministic Order IDs:** When calling the upstream API `POST /orders`, always supply an `externalOrderId` (e.g. `aura_ord_<timestamp>_<userId>`). This ensures the upstream API returns duplicate cached deliveries if a network timeout occurs, preventing duplicate billing.
3. **Safe API Key Storage:** Keep the upstream Bearer token exclusively in server-side environment variables (`UPSTREAM_API_KEY`). Never expose it to the client.

### B. Pricing Engine Formulas
* **Dynamic Formula:** `MMK_Price = RoundUp(USD_Price * USD_Exchange_Rate * (1 + Markup_Percent / 100), 100)`
* **Static Override:** Individual products can have explicit `customMmkPrice` set in the database, overriding the dynamic formula.
