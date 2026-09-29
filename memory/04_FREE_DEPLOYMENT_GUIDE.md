# 04 — 100% Free Deployment Guide (Vercel + Supabase)

This guide walks through deploying the entire **Aura Store** application (Next.js Dashboard + Serverless Telegram Bot Webhook) without spending a single dollar, utilizing the robust Free Tiers of **Vercel** and **Supabase**.

---

## 1. Prerequisites (All Free Accounts)
1. **GitHub Account** — [github.com](https://github.com)
2. **Vercel Account** — [vercel.com](https://vercel.com) (Hobby Free Plan)
3. **Supabase Account** — [supabase.com](https://supabase.com) (Free Tier PostgreSQL)
4. **Telegram Bot Token** — Created via `@BotFather` on Telegram

---

## 2. Step-by-Step Deployment Walkthrough

### Step 1: Provision Free Database on Supabase
1. Log in to [Supabase](https://supabase.com) and click **New Project**.
2. Name the project `aura-store` and set a strong database password.
3. Once the database is ready, navigate to **Project Settings -> Database**.
4. Copy the **Connection String (URI)**. Select **Transaction Pooler (Port 6543)** or **Direct Connection (Port 5432)**:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
   DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
   ```

### Step 2: Initialize Prisma Database Schema
From your local machine or terminal:
```bash
# Push the schema directly to Supabase PostgreSQL
npx prisma db push
```

### Step 3: Deploy to Vercel
1. Push your repository code to a new private GitHub repository.
2. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New -> Project**.
3. Import your GitHub repository (`aura-store`).
4. Under **Environment Variables**, add the following keys:

| Variable Name | Example Value | Note |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://...` | Supabase Connection URI |
| `DIRECT_URL` | `postgresql://...` | Supabase Direct URI (for Prisma migrations) |
| `TELEGRAM_BOT_TOKEN` | `7123456789:AAFx...` | From `@BotFather` |
| `UPSTREAM_API_URL` | `http://paid2.daki.cc:4153/api/partner/v1` | Upstream API Endpoint |
| `UPSTREAM_API_KEY` | `sk_live_...` | Upstream Partner Secret Key |
| `NEXTAUTH_SECRET` | `a_super_secret_random_key_here` | For Admin Dashboard Auth |
| `ADMIN_PASSWORD` | `your_secure_admin_password` | Master password for dashboard login |

5. Click **Deploy**. Vercel will build and assign you a production domain (e.g., `https://aura-store-prod.vercel.app`).

---

### Step 4: Register the Telegram Webhook (One-Time Setup)
Once Vercel deployment completes, register your bot webhook so Telegram forwards all incoming chats to Vercel:

Run this command in your terminal or web browser:
```bash
curl -F "url=https://aura-store-prod.vercel.app/api/webhook" https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/setWebhook
```

**Expected Telegram Response:**
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

---

## 3. Verifying the Deployment

1. **Test the Telegram Bot:**
   * Open your Telegram bot in Telegram and send `/start`.
   * You should instantly receive the **Aura Store** Welcome Menu with MMK balance and interactive category buttons.
2. **Access the Admin Dashboard:**
   * Open `https://aura-store-prod.vercel.app/admin` in your browser.
   * Verify that the live upstream USD balance (e.g., `$1.00`) is displayed properly.
   * Click **Sync Catalog** to pull all active products from the upstream API into your Supabase database.

---

## 4. Maintenance & Zero-Cost Limits

* **Vercel Hobby Plan:** 100,000 serverless function executions per day (more than enough for thousands of active daily users).
* **Supabase Free Tier:** 500 MB database storage + 50,000 monthly active users (ample room for millions of order records).
* **Zero Cold Sleep:** Webhooks ensure fast response times on demand without keeping idle server memory running.
