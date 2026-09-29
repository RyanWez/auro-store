# 01 — Database Schema & Data Models (PostgreSQL / Prisma)

## 1. Overview
The database layer is hosted on **Supabase PostgreSQL** and queried using **Prisma ORM**. All monetary calculations on the customer side use `Float` or `BigInt` (MMK Kyats are whole numbers).

---

## 2. Complete Prisma Schema (`prisma/schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// -----------------------------------------------------------------------------
// USER & WALLET
// -----------------------------------------------------------------------------
model User {
  id           Int           @id @default(autoincrement())
  telegramId   BigInt        @unique
  username     String?
  firstName    String?
  lastName     String?
  mmkBalance   Float         @default(0.0) // Customer wallet balance in MMK
  totalSpent   Float         @default(0.0) // Lifetime spend in MMK
  isBanned     Boolean       @default(false)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  orders       Order[]
  slips        DepositSlip[]

  @@index([telegramId])
}

// -----------------------------------------------------------------------------
// PRODUCT CATALOG & PRICING
// -----------------------------------------------------------------------------
model Category {
  id           Int       @id @default(autoincrement())
  upstreamId   Int       @unique
  name         String
  icon         String?
  displayOrder Int       @default(0)
  isVisible    Boolean   @default(true)
  products     Product[]
}

model Product {
  id               Int       @id @default(autoincrement())
  upstreamId       Int       @unique // Product ID from upstream API
  categoryId       Int?
  category         Category? @relation(fields: [categoryId], references: [id])
  name             String
  description      String?   @db.Text
  deliveryType     String    @default("TEXT") // TEXT, CREDENTIALS, LINK
  upstreamPriceUsd Float     // Original base price in USD from upstream
  mmkPrice         Float     // Selling price in MMK (calculated or overridden)
  isCustomPrice    Boolean   @default(false) // If true, ignore auto-formula
  stock            Int       @default(0)
  inStock          Boolean   @default(true)
  isVisible        Boolean   @default(true) // Whether visible in bot menu
  updatedAt        DateTime  @updatedAt

  orders           Order[]

  @@index([upstreamId])
  @@index([isVisible, inStock])
}

// -----------------------------------------------------------------------------
// ORDERS & FULFILLMENT
// -----------------------------------------------------------------------------
enum OrderStatus {
  COMPLETED
  PENDING
  FAILED
  REFUNDED
}

model Order {
  id              Int         @id @default(autoincrement())
  externalOrderId String      @unique // Idempotent key: aura_ord_<timestamp>_<userId>
  upstreamOrderId Int?        // Upstream order reference ID
  userId          Int
  user            User        @relation(fields: [userId], references: [id])
  productId       Int
  product         Product     @relation(fields: [productId], references: [id])
  productName     String
  quantity        Int         @default(1)
  unitMmkPrice    Float
  totalMmkPrice   Float
  costUsd         Float?      // Upstream wholesale cost incurred
  profitMmk       Float?      // Calculated net profit in MMK
  deliveryLines   String[]    // Credentials/Keys delivered (1 per line)
  status          OrderStatus @default(COMPLETED)
  errorMessage    String?
  createdAt       DateTime    @default(now())

  @@index([userId])
  @@index([externalOrderId])
}

// -----------------------------------------------------------------------------
// DEPOSITS & PAYMENT SLIPS
// -----------------------------------------------------------------------------
enum SlipStatus {
  PENDING
  APPROVED
  REJECTED
}

enum PaymentProvider {
  KBZ_PAY
  WAVE_PAY
  MANUAL_BANK
}

model DepositSlip {
  id            Int             @id @default(autoincrement())
  userId        Int
  user          User            @relation(fields: [userId], references: [id])
  provider      PaymentProvider @default(KBZ_PAY)
  amountMmk     Float
  transactionId String?         // Last 6 digits or full txn reference
  telegramFileId String         // Telegram image file ID for viewing in Admin Panel
  status        SlipStatus      @default(PENDING)
  adminNote     String?
  approvedAt    DateTime?
  createdAt     DateTime        @default(now())

  @@index([userId])
  @@index([status])
}

// -----------------------------------------------------------------------------
// GLOBAL SETTINGS & CONFIGURATION
// -----------------------------------------------------------------------------
model Setting {
  key         String   @id // e.g. "usd_exchange_rate", "profit_margin_pct", "kpay_no", "wave_no"
  value       String
  description String?
  updatedAt   DateTime @updatedAt
}
```

---

## 3. Seed / Default Settings Configuration

| Key | Default Value | Description |
| :--- | :--- | :--- |
| `usd_exchange_rate` | `4850` | Current Market MMK/USD exchange rate |
| `profit_margin_pct` | `25` | Default markup percentage applied to products |
| `kpay_phone` | `09xxxxxxxxx` | KBZPay Account Number for user deposits |
| `kpay_name` | `Aura Store Pay` | KBZPay Account Name |
| `wave_phone` | `09xxxxxxxxx` | WavePay Account Number |
| `wave_name` | `Aura Store Pay` | WavePay Account Name |
| `support_contact` | `@AuraStoreSupport` | Support handle displayed in bot |
| `channel_link` | `https://t.me/AuraStoreOfficial` | Official updates channel |
