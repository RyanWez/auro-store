# 03 — UI / UX & Flow Specification (Telegram Bot & Admin)

## 1. Telegram Bot UI Layout (Myanmar Language & Kyat)

The Telegram Bot interface is designed to emulate the polished UX shown in the reference designs while presenting all monetary values in Myanmar Kyat (Ks / MMK).

---

### A. Screen 1: Main Menu (`/start`)

**Message Text:**
```
👋 Welcome to Aura Digital Store! ✨

ကျွန်ုပ်တို့၏ Aura Store မှ ကြိုဆိုပါသည်ခင်ဗျာ။ 
Digital Accounts, Subscriptions & AI Keys များကို အသက်သာဆုံး စျေးနှုန်းများဖြင့် စက္ကန့်ပိုင်းအတွင်း အလိုအလျောက် ဝယ်ယူရရှိနိုင်ပါသည်။

💰 သင်၏ လက်ကျန်ငွေ: 0 MMK
```

**Inline Keyboard Grid (2 Columns):**
```
+------------------------------------+------------------------------------+
|  🛍️ ပစ္စည်းများဝယ်ရန် (Buy Products)   |  🎁 ဝယ်ယူခဲ့သော အော်ဒါများ (My Orders) |
+------------------------------------+------------------------------------+
|  💰 ပိုက်ဆံအိတ် / ငွေဖြည့် (Wallet)    |  👤 ကျွန်ုပ်၏ အကောင့် (My Profile)     |
+------------------------------------+------------------------------------+
|                💬 အကူအညီရယူရန် (Support)                                |
+-------------------------------------------------------------------------+
|                📢 Join Our Telegram Channel                             |
+-------------------------------------------------------------------------+
```

---

### B. Screen 2: Categories Browsing

**Message Text:**
```
🏪 Store Categories 🛍️
ဝယ်ယူလိုသော Product Category ကို အောက်ပါ ခလုတ်များမှ ရွေးချယ်ပါ 👇
```

**Inline Keyboard Grid (2xN Matrix):**
```
+------------------------------------+------------------------------------+
|  🤖 GEMINI AI                      |  💚 SPOTIFY                        |
+------------------------------------+------------------------------------+
|  ✨ CHAT GPT                       |  🎬 NETFLIX                        |
+------------------------------------+------------------------------------+
|  🎨 CANVA PRO                      |  ✂️ CAPCUT PRO                     |
+------------------------------------+------------------------------------+
|  📺 YOUTUBE PREMIUM                |  🛡️ VPN SERVICES                   |
+------------------------------------+------------------------------------+
|                     🔙 နောက်သို့ (Back)                                    |
+-------------------------------------------------------------------------+
```

---

### C. Screen 3: Product Detail & Stepper Selector

**Message Text:**
```
🎁 GEMINI AI 18 MONTH
━━━━━━━━━━━━━━━━━━━━━━━━
⚡️ Gemini AI Pro
⚡️ Instant Redeem Link
☁️ 5TB Cloud Storage
👥 Add Up to 5 Users
🔒 100% Private
🏠 Full Family Account — Not an Invite
🎯 Activated on Your Own Gmail
💳 No Card Required
🌐 Works Worldwide — No Verification
🔗 Simply open the link → Activate Offer → Done!
⚠️ Redeem within 24H • Report link issues within 24H

💵 Price: 2,500 Ks
📦 Stock: 449 available
━━━━━━━━━━━━━━━━━━━━━━━━
🧮 ရွေးချယ်ထားသော အရေအတွက်: 1
💰 စုစုပေါင်း ကျသင့်ငွေ: 2,500 Ks

Pick a quantity below, then tap Buy Now 👇
```

**Inline Keyboards (Stepper + Quick Pickers + Action):**
```
+---------------+---------------------+---------------+
|      ➖       |        🔢 1         |      ➕       |
+---------------+---------------------+---------------+
|     ✅ 1      |          5          |      10       |
+---------------+---------------------+---------------+
|      20       |         30          |      50       |
+---------------+---------------------+---------------+
|              ✍️ Custom Quantity (စိတ်ကြိုက်အရေအတွက်)   |
+-----------------------------------------------------+
|              💳 Buy Now • 2,500 Ks (ဝယ်ယူမည်)         |
+-----------------------------------------------------+
|                      🔙 Back (နောက်သို့)              |
+-----------------------------------------------------+
```

---

### D. Screen 4: Wallet & Top-Up (KPay / WavePay)

**Message Text:**
```
💰 Aura Store Wallet
━━━━━━━━━━━━━━━━━━━━━━━━
👤 User: @customer_name
💳 Balance: 15,000 MMK
🛍️ Total Orders: 3

ငွေဖြည့်သွင်းလိုပါက အောက်ပါ ငွေလွှဲနည်းလမ်းတစ်ခုကို ရွေးချယ်ပါ 👇
```

**Inline Keyboards:**
```
+-----------------------------------------------------+
|  🟢 KBZPay ဖြင့် ငွေဖြည့်မည်                           |
+-----------------------------------------------------+
|  🟡 WavePay ဖြင့် ငွေဖြည့်မည်                          |
+-----------------------------------------------------+
|  🔙 Back (နောက်သို့)                                 |
+-----------------------------------------------------+
```

**Slip Upload Prompt:**
```
📸 ကျေးဇူးပြု၍ ငွေလွှဲထားသော Screenshot (Slip) ပုံကို ဤနေရာတွင် ပို့ပေးပါခင်ဗျာ။
Admin ဘက်မှ အတည်ပြုပြီးသည်နှင့် သင့် Wallet ထဲသို့ ငွေချက်ချင်း ဝင်ရောက်မည်ဖြစ်ပါသည်။
```

---

## 2. Next.js Admin Dashboard UI Specification

### A. Dashboard Overview (`/admin`)
* **KPI Cards:**
  1. **Upstream Live Balance:** Realtime USD balance from `GET /balance` (Badge warning if < $5.00).
  2. **Pending Slips:** Badge with counter and quick link to review desk.
  3. **Today's MMK Revenue & Net Profit:** Live calculation from database.
  4. **Active Products & Out-of-Stock count.**

### B. Catalog Manager (`/admin/products`)
* Table showing Product Name, Upstream USD Price, Calculated MMK Price, Live Stock, and Active toggle.
* **Inline Actions:**
  * Edit MMK Custom Price.
  * Toggle Bot Visibility (Show/Hide).
  * 1-Click Sync with Upstream Catalog.

### C. Payment Slips Review Desk (`/admin/slips`)
* Visual card list of pending deposits.
* Displays Telegram User Profile, Payment Method (KPay/Wave), Slip Image Viewer with zoom, and detected Transaction ID.
* **Actions:**
  * **Approve:** One click credits user balance and triggers Telegram instant notification.
  * **Reject:** Optional reason text prompt sent back to user.

### D. Pricing Settings (`/admin/settings`)
* **USD Exchange Rate:** e.g., `4,850` MMK.
* **Markup Percentage:** e.g., `25%`.
* **KPay / WavePay Account Details** (Phone & Name).
* **Bot Support & Channel Links.**
