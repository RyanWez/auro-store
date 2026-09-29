import { Bot, Context } from "grammy";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser, getUserByTelegramId } from "@/lib/db/users";
import { executeAtomicOrderPurchase, getUserOrders } from "@/lib/db/orders";
import { createDepositSlip } from "@/lib/db/slips";
import { getPaymentSettings, getPricingSettings } from "@/lib/db/settings";
import { formatMmk, formatUsd } from "@/lib/utils/formatters";
import {
  mainMenuKeyboard,
  createCategoryKeyboard,
  createProductListKeyboard,
  createQuantityKeyboard,
  walletPaymentKeyboard,
  cancelToMainKeyboard,
} from "./keyboards";
import { sessionManager } from "./session";

export function registerHandlers(bot: Bot) {
  // /start command
  bot.command("start", async (ctx) => {
    const telegramId = BigInt(ctx.from?.id || 0);
    sessionManager.clear(ctx.from?.id || 0);

    const user = await getOrCreateUser(telegramId, {
      username: ctx.from?.username,
      firstName: ctx.from?.first_name,
      lastName: ctx.from?.last_name,
    });

    const welcomeMsg =
      `👋 **Welcome to Aura Digital Store!** ✨\n\n` +
      `ကျွန်ုပ်တို့၏ Aura Store မှ နွေးထွေးစွာ ကြိုဆိုပါသည်ခင်ဗျာ။\n` +
      `Digital Accounts, Subscriptions & AI Keys များကို အသက်သာဆုံး စျေးနှုန်းများဖြင့် စက္ကန့်ပိုင်းအတွင်း အလိုအလျောက် ဝယ်ယူရရှိနိုင်ပါသည်။\n\n` +
      `💰 သင်၏ လက်ကျန်ငွေ: **${formatMmk(user.mmkBalance)}**\n\n` +
      `ဝယ်ယူလိုသော ဝန်ဆောင်မှုများကို အောက်ပါ Menu မှ ရွေးချယ်နိုင်ပါသည် 👇`;

    await ctx.reply(welcomeMsg, {
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard,
    });
  });

  // Main Menu Navigation
  bot.callbackQuery("menu_main", async (ctx) => {
    sessionManager.clear(ctx.from.id);
    await ctx.answerCallbackQuery();
    await ctx.editMessageText("🏪 **Aura Store Main Menu**\nChoose an option below 👇", {
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard,
    });
  });

  // Browse Categories
  bot.callbackQuery("menu_categories", async (ctx) => {
    await ctx.answerCallbackQuery();
    const categories = await prisma.category.findMany({
      where: { isVisible: true },
      orderBy: { displayOrder: "asc" },
    });

    if (categories.length === 0) {
      return ctx.editMessageText(
        "🏪 **Store Categories**\n\nလတ်တလောတွင် ပစ္စည်းအမျိုးအစားများ မရှိသေးပါခင်ဗျာ။",
        {
          parse_mode: "Markdown",
          reply_markup: mainMenuKeyboard,
        }
      );
    }

    await ctx.editMessageText(
      "🏪 **Store Categories** 🛍️\nဝယ်ယူလိုသော Category ကို အောက်ပါ ခလုတ်များမှ ရွေးချယ်ပါ 👇",
      {
        parse_mode: "Markdown",
        reply_markup: createCategoryKeyboard(categories),
      }
    );
  });

  // Products in Category
  bot.callbackQuery(/^cat_(\d+)$/, async (ctx) => {
    const categoryId = parseInt(ctx.match[1], 10);
    await ctx.answerCallbackQuery();

    const [category, products] = await Promise.all([
      prisma.category.findUnique({ where: { id: categoryId } }),
      prisma.product.findMany({
        where: { categoryId, isVisible: true },
        orderBy: { name: "asc" },
      }),
    ]);

    if (!category || products.length === 0) {
      return ctx.editMessageText(
        "📦 **Products**\n\nဤ Category ထဲတွင် လတ်တလော ပစ္စည်းမရှိသေးပါခင်ဗျာ။",
        {
          parse_mode: "Markdown",
          reply_markup: createCategoryKeyboard(await prisma.category.findMany({ where: { isVisible: true } })),
        }
      );
    }

    await ctx.editMessageText(
      `🛍️ **${category.name.replace(/\{pe:[0-9]+\}\s*/g, "")} Categories**\nဝယ်ယူလိုသော ပစ္စည်းကို ရွေးချယ်ပါ 👇`,
      {
        parse_mode: "Markdown",
        reply_markup: createProductListKeyboard(products),
      }
    );
  });

  // Product Details & Quantity Stepper
  bot.callbackQuery(/^prod_(\d+)$/, async (ctx) => {
    const productId = parseInt(ctx.match[1], 10);
    await ctx.answerCallbackQuery();

    const [product, pricingSettings] = await Promise.all([
      prisma.product.findUnique({ where: { id: productId } }),
      getPricingSettings(),
    ]);

    if (!product || !product.inStock || product.stock <= 0) {
      return ctx.editMessageText("❌ တောင်းပန်ပါသည်၊ ဤပစ္စည်းသည် ပစ္စည်းပြတ်သွားပါပြီခင်ဗျာ။", {
        reply_markup: mainMenuKeyboard,
      });
    }

    const defaultQty = 1;
    const maxLimit = pricingSettings.maxPurchaseLimit || 10;
    const cleanDesc = product.description ? `\n${product.description}\n` : "";

    const caption =
      `🎁 **${product.name.replace(/\{pe:[0-9]+\}\s*/g, "")}**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `${cleanDesc}\n` +
      `💵 စျေးနှုန်း (1 ခု): **${formatMmk(product.mmkPrice)}**\n` +
      `📦 လက်ကျန် Stock: **${product.stock} ခု ရရှိနိုင်**\n` +
      `⚠️ *တစ်ကြိမ်လျှင် အများဆုံး ${maxLimit} ခုအထိသာ ဝယ်ယူနိုင်ပါသည်*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🧮 ရွေးချယ်ထားသော အရေအတွက်: **${defaultQty}**\n` +
      `💰 စုစုပေါင်း ကျသင့်ငွေ: **${formatMmk(product.mmkPrice * defaultQty)}**\n\n` +
      `Pick a quantity below, then tap Buy Now 👇`;

    await ctx.editMessageText(caption, {
      parse_mode: "Markdown",
      reply_markup: createQuantityKeyboard(product.id, defaultQty, product.stock, product.mmkPrice, maxLimit),
    });
  });

  // Quantity Stepper Handler (Limited to max 10)
  bot.callbackQuery(/^qty_(\d+)_(\d+)$/, async (ctx) => {
    const productId = parseInt(ctx.match[1], 10);
    const targetQty = parseInt(ctx.match[2], 10);
    await ctx.answerCallbackQuery();

    const [product, pricingSettings] = await Promise.all([
      prisma.product.findUnique({ where: { id: productId } }),
      getPricingSettings(),
    ]);

    if (!product) return;

    const maxLimit = pricingSettings.maxPurchaseLimit || 10;
    const effectiveMax = Math.min(product.stock, maxLimit);
    const clampedQty = Math.max(1, Math.min(targetQty, effectiveMax));
    const cleanDesc = product.description ? `\n${product.description}\n` : "";

    const caption =
      `🎁 **${product.name.replace(/\{pe:[0-9]+\}\s*/g, "")}**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `${cleanDesc}\n` +
      `💵 စျေးနှုန်း (1 ခု): **${formatMmk(product.mmkPrice)}**\n` +
      `📦 လက်ကျန် Stock: **${product.stock} ခု ရရှိနိုင်**\n` +
      `⚠️ *တစ်ကြိမ်လျှင် အများဆုံး ${maxLimit} ခုအထိသာ ဝယ်ယူနိုင်ပါသည်*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🧮 ရွေးချယ်ထားသော အရေအတွက်: **${clampedQty}**\n` +
      `💰 စုစုပေါင်း ကျသင့်ငွေ: **${formatMmk(product.mmkPrice * clampedQty)}**\n\n` +
      `Pick a quantity below, then tap Buy Now 👇`;

    await ctx.editMessageText(caption, {
      parse_mode: "Markdown",
      reply_markup: createQuantityKeyboard(product.id, clampedQty, product.stock, product.mmkPrice, maxLimit),
    });
  });

  // Custom Quantity Prompt (1 to 10 only)
  bot.callbackQuery(/^custom_qty_(\d+)$/, async (ctx) => {
    const productId = parseInt(ctx.match[1], 10);
    await ctx.answerCallbackQuery();

    sessionManager.set(ctx.from.id, {
      step: "WAITING_CUSTOM_QTY",
      productId,
    });

    await ctx.reply(
      `✍️ **စိတ်ကြိုက် အရေအတွက် ရိုက်ထည့်ပါ**\n\nဝယ်ယူလိုသော အရေအတွက်ကို (ဂဏန်းသီးသန့် 1 မှ 10 အထိ) ရိုက်ပို့ပေးပါခင်ဗျာ 👇`,
      {
        parse_mode: "Markdown",
        reply_markup: cancelToMainKeyboard,
      }
    );
  });

  // Buy Now Action
  bot.callbackQuery(/^buy_(\d+)_(\d+)$/, async (ctx) => {
    const productId = parseInt(ctx.match[1], 10);
    const quantity = parseInt(ctx.match[2], 10);
    const telegramId = BigInt(ctx.from.id);

    await ctx.answerCallbackQuery({ text: "⏳ Order လုပ်ဆောင်နေပါသည်..." });

    const user = await getUserByTelegramId(telegramId);
    if (!user) return ctx.reply("❌ Error loading customer account");

    try {
      const result = await executeAtomicOrderPurchase({
        userId: user.id,
        productId,
        quantity,
      });

      const deliveryItems = result.deliveryLines
        .map((line, idx) => `🔑 **Item ${idx + 1}:**\n\`${line}\``)
        .join("\n\n");

      const successMsg =
        `✅ **ဝယ်ယူမှု အောင်မြင်ပါသည်!** 🎉\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📦 ပစ္စည်း: **${result.productName.replace(/\{pe:[0-9]+\}\s*/g, "")}**\n` +
        `🔢 အရေအတွက်: **${result.quantity}**\n` +
        `💰 စုစုပေါင်း: **${formatMmk(result.totalMmkPrice)}**\n` +
        `💳 ကျန်ရှိသော Wallet: **${formatMmk(result.remainingMmkBalance)}**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📥 **Delivered Keys / Accounts:**\n\n` +
        `${deliveryItems}\n\n` +
        `⚠️ *ပေးပို့ထားသော Key/Account များကို သေချာစွာ သိမ်းဆည်းထားပါခင်ဗျာ။ My Orders ထဲတွင်လည်း အချိန်မရွေး ပြန်လည်ကြည့်ရှုနိုင်ပါသည်။*`;

      await ctx.reply(successMsg, {
        parse_mode: "Markdown",
        reply_markup: mainMenuKeyboard,
      });
    } catch (err: any) {
      await ctx.reply(`❌ **ဝယ်ယူမှု မအောင်မြင်ပါ:**\n${err.message}`, {
        reply_markup: mainMenuKeyboard,
      });
    }
  });

  // Wallet & Top-up View
  bot.callbackQuery("menu_wallet", async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = BigInt(ctx.from.id);
    const user = await getUserByTelegramId(telegramId);
    const balance = user?.mmkBalance || 0;

    const text =
      `💰 **Aura Store Wallet**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 User: @${ctx.from.username || ctx.from.first_name}\n` +
      `💳 Balance: **${formatMmk(balance)}**\n` +
      `🛍️ Total Spent: **${formatMmk(user?.totalSpent || 0)}**\n\n` +
      `ငွေဖြည့်သွင်းလိုပါက အောက်ပါ ငွေလွှဲနည်းလမ်းတစ်ခုကို ရွေးချယ်ပါ 👇`;

    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      reply_markup: walletPaymentKeyboard,
    });
  });

  // KBZPay Top-up Instruction
  bot.callbackQuery("topup_kpay", async (ctx) => {
    await ctx.answerCallbackQuery();
    const payment = await getPaymentSettings();

    sessionManager.set(ctx.from.id, {
      step: "WAITING_SLIP_PHOTO",
      paymentProvider: "KBZ_PAY",
    });

    const text =
      `🟢 **KBZPay ဖြင့် ငွေဖြည့်သွင်းခြင်း**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📱 KBZPay Phone: \`${payment.kpayPhone}\`\n` +
      `👤 Name: **${payment.kpayName}**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💡 **ညွှန်ကြားချက်:**\n` +
      `၁။ အထက်ပါ KBZPay အကောင့်သို့ မိမိဖြည့်လိုသော ငွေပမာဏ လွှဲပေးပါ။\n` +
      `၂။ ငွေလွှဲပြီးပါက **ငွေလွှဲပြေစာ Screenshot (Slip)** ကို ဤနေရာတွင် ပုံအဖြစ် ပို့ပေးပါခင်ဗျာ။\n\n` +
      `Admin စစ်ဆေးအတည်ပြုပြီးသည်နှင့် သင့် Wallet ထဲသို့ ငွေချက်ချင်း ဝင်ရောက်မည်ဖြစ်ပါသည်။`;

    await ctx.reply(text, {
      parse_mode: "Markdown",
      reply_markup: cancelToMainKeyboard,
    });
  });

  // WavePay Top-up Instruction
  bot.callbackQuery("topup_wave", async (ctx) => {
    await ctx.answerCallbackQuery();
    const payment = await getPaymentSettings();

    sessionManager.set(ctx.from.id, {
      step: "WAITING_SLIP_PHOTO",
      paymentProvider: "WAVE_PAY",
    });

    const text =
      `🟡 **WavePay ဖြင့် ငွေဖြည့်သွင်းခြင်း**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📱 WavePay Phone: \`${payment.wavePhone}\`\n` +
      `👤 Name: **${payment.waveName}**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💡 **ညွှန်ကြားချက်:**\n` +
      `၁။ အထက်ပါ WavePay အကောင့်သို့ မိမိဖြည့်လိုသော ငွေပမာဏ လွှဲပေးပါ။\n` +
      `၂။ ငွေလွှဲပြီးပါက **ငွေလွှဲပြေစာ Screenshot (Slip)** ကို ဤနေရာတွင် ပုံအဖြစ် ပို့ပေးပါခင်ဗျာ။\n\n` +
      `Admin စစ်ဆေးအတည်ပြုပြီးသည်နှင့် သင့် Wallet ထဲသို့ ငွေချက်ချင်း ဝင်ရောက်မည်ဖြစ်ပါသည်။`;

    await ctx.reply(text, {
      parse_mode: "Markdown",
      reply_markup: cancelToMainKeyboard,
    });
  });

  // My Orders View
  bot.callbackQuery("menu_orders", async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = BigInt(ctx.from.id);
    const user = await getUserByTelegramId(telegramId);

    if (!user) return ctx.reply("❌ User not found");

    const orders = await getUserOrders(user.id, { limit: 5 });

    if (orders.length === 0) {
      return ctx.editMessageText(
        `🎁 **My Orders (ဝယ်ယူခဲ့သော အော်ဒါများ)**\n\nသင် ဝယ်ယူထားသော အော်ဒါမှတ်တမ်း မရှိသေးပါခင်ဗျာ။`,
        {
          parse_mode: "Markdown",
          reply_markup: mainMenuKeyboard,
        }
      );
    }

    let ordersText = `🎁 **My Recent Orders (နောက်ဆုံးဝယ်ယူခဲ့သော ၅ ခု):**\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (const ord of orders) {
      const keysText = ord.deliveryLines.map((k) => `\`${k}\``).join("\n");
      ordersText +=
        `📦 **${ord.productName.replace(/\{pe:[0-9]+\}\s*/g, "")}** (x${ord.quantity})\n` +
        `💰 ကျသင့်ငွေ: ${formatMmk(ord.totalMmkPrice)}\n` +
        `📅 ရက်စွဲ: ${ord.createdAt.toLocaleDateString()}\n` +
        `🔑 **Delivery Key:**\n${keysText}\n` +
        `────────────────────────\n\n`;
    }

    await ctx.editMessageText(ordersText, {
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard,
    });
  });

  // My Profile View
  bot.callbackQuery("menu_profile", async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = BigInt(ctx.from.id);
    const user = await getUserByTelegramId(telegramId);
    if (!user) return;

    const profileText =
      `👤 **Aura Store Customer Profile**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 User ID: \`${ctx.from.id}\`\n` +
      `👤 Name: ${ctx.from.first_name} ${ctx.from.last_name || ""}\n` +
      `🔗 Username: @${ctx.from.username || "None"}\n` +
      `💳 Wallet Balance: **${formatMmk(user.mmkBalance)}**\n` +
      `🛍️ Total Spend: **${formatMmk(user.totalSpent)}**\n` +
      `📅 Member Since: ${user.createdAt.toLocaleDateString()}`;

    await ctx.editMessageText(profileText, {
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard,
    });
  });

  // Support View
  bot.callbackQuery("menu_support", async (ctx) => {
    await ctx.answerCallbackQuery();
    const payment = await getPaymentSettings();

    const text =
      `💬 **Aura Store Customer Support**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `အကူအညီ လိုအပ်ပါက သို့မဟုတ် မရှင်းလင်းသည်များ ရှိပါက Admin ထံ တိုက်ရိုက် ဆက်သွယ် မေးမြန်းနိုင်ပါသည်:\n\n` +
      `👉 Admin Support: ${payment.supportContact}\n` +
      `📢 Official Channel: ${payment.channelLink}\n` +
      `⏰ Support Hours: 9:00 AM – 11:00 PM (Daily)`;

    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard,
    });
  });

  // Text message listener (for custom quantity input)
  bot.on("message:text", async (ctx) => {
    const session = sessionManager.get(ctx.from.id);

    if (session.step === "WAITING_CUSTOM_QTY" && session.productId) {
      const inputQty = parseInt(ctx.message.text.trim(), 10);
      const pricingSettings = await getPricingSettings();
      const maxLimit = pricingSettings.maxPurchaseLimit || 10;

      if (isNaN(inputQty) || inputQty < 1 || inputQty > maxLimit) {
        return ctx.reply(
          `⚠️ **မှားယွင်းသော အရေအတွက်ဖြစ်ပါသည်!**\n\nကျေးဇူးပြု၍ **1 မှ ${maxLimit} အထိ** ဂဏန်းတစ်ခုကိုသာ ရိုက်ထည့်ပေးပါခင်ဗျာ။`,
          { parse_mode: "Markdown" }
        );
      }

      sessionManager.clear(ctx.from.id);

      const product = await prisma.product.findUnique({ where: { id: session.productId } });
      if (!product) return ctx.reply("❌ Product not found");

      const clampedQty = Math.min(inputQty, product.stock);
      const cleanDesc = product.description ? `\n${product.description}\n` : "";

      const caption =
        `🎁 **${product.name.replace(/\{pe:[0-9]+\}\s*/g, "")}**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `${cleanDesc}\n` +
        `💵 စျေးနှုန်း (1 ခု): **${formatMmk(product.mmkPrice)}**\n` +
        `📦 လက်ကျန် Stock: **${product.stock} ခု ရရှိနိုင်**\n` +
        `⚠️ *တစ်ကြိမ်လျှင် အများဆုံး ${maxLimit} ခုအထိသာ ဝယ်ယူနိုင်ပါသည်*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🧮 ရွေးချယ်ထားသော အရေအတွက်: **${clampedQty}**\n` +
        `💰 စုစုပေါင်း ကျသင့်ငွေ: **${formatMmk(product.mmkPrice * clampedQty)}**\n\n` +
        `Tap Buy Now to complete purchase 👇`;

      await ctx.reply(caption, {
        parse_mode: "Markdown",
        reply_markup: createQuantityKeyboard(product.id, clampedQty, product.stock, product.mmkPrice, maxLimit),
      });
    }
  });

  // Photo listener (for KBZPay / WavePay screenshot slip uploads)
  bot.on("message:photo", async (ctx) => {
    const session = sessionManager.get(ctx.from.id);

    if (session.step === "WAITING_SLIP_PHOTO") {
      const photos = ctx.message.photo;
      const largestPhoto = photos[photos.length - 1]; // Highest resolution
      const telegramId = BigInt(ctx.from.id);
      const user = await getUserByTelegramId(telegramId);

      if (!user) return ctx.reply("❌ User not found");

      await createDepositSlip({
        userId: user.id,
        provider: session.paymentProvider || "KBZ_PAY",
        amountMmk: 0, // Admin will confirm amount or user can type
        telegramFileId: largestPhoto.file_id,
        transactionId: ctx.message.caption || null,
      });

      sessionManager.clear(ctx.from.id);

      await ctx.reply(
        `📸 **ငွေလွှဲပြေစာ (Slip) လက်ခံရရှိပါသည်!** ✅\n\n` +
        `Admin ဘက်မှ ငွေလွှဲပြေစာကို စစ်ဆေးအတည်ပြုပြီးသည်နှင့် သင့် Wallet ထဲသို့ ငွေချက်ချင်း ဝင်ရောက်မည်ဖြစ်ပါသည်။\n\n` +
        `ခေတ္တစောင့်ဆိုင်းပေးပါခင်ဗျာ 🙏`,
        {
          parse_mode: "Markdown",
          reply_markup: mainMenuKeyboard,
        }
      );
    }
  });
}
