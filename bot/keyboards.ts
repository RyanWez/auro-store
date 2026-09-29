import { InlineKeyboard } from "grammy";
import { formatMmk } from "@/lib/utils/formatters";

/**
 * Main Menu Keyboard (Myanmar)
 */
export const mainMenuKeyboard = new InlineKeyboard()
  .text("🛍️ Buy Products", "menu_categories")
  .text("🎁 My Orders", "menu_orders").row()
  .text("💰 Wallet", "menu_wallet")
  .text("👤 My Profile", "menu_profile").row()
  .text("💬 Support", "menu_support").row()
  .url("📢 Join Our Channel", process.env.CHANNEL_URL || "https://t.me/AuraStoreOfficial");

/**
 * Category Listing Keyboard (2 columns)
 */
export function createCategoryKeyboard(categories: Array<{ id: number; name: string }>) {
  const kb = new InlineKeyboard();
  for (let i = 0; i < categories.length; i++) {
    const cleanName = categories[i].name.replace(/\{pe:[0-9]+\}\s*/g, "").trim();
    kb.text(cleanName, `cat_${categories[i].id}`);
    if ((i + 1) % 2 === 0) kb.row();
  }
  kb.row().text("🔙 Back to Main Menu", "menu_main");
  return kb;
}

/**
 * Products inside Category Listing Keyboard
 */
export function createProductListKeyboard(
  products: Array<{ id: number; name: string; mmkPrice: number; inStock: boolean; stock: number }>
) {
  const kb = new InlineKeyboard();
  for (const prod of products) {
    const cleanName = prod.name.replace(/\{pe:[0-9]+\}\s*/g, "").trim();
    const stockStatus = prod.inStock && prod.stock > 0 ? `${formatMmk(prod.mmkPrice)}` : "🔴 Out of Stock";
    kb.text(`${cleanName} — ${stockStatus}`, `prod_${prod.id}`).row();
  }
  kb.text("🔙 Back to Categories", "menu_categories");
  return kb;
}

/**
 * Quantity Stepper & Quick Selector Keyboard
 * Strictly limited to 1, 5, 10 maximum units per purchase!
 */
export function createQuantityKeyboard(
  productId: number,
  currentQty: number,
  maxStock: number,
  unitMmkPrice: number,
  maxAllowedLimit: number = 10
) {
  const effectiveMax = Math.min(maxStock, maxAllowedLimit);
  const clampedQty = Math.max(1, Math.min(currentQty, effectiveMax));
  const totalMmk = clampedQty * unitMmkPrice;
  const kb = new InlineKeyboard();

  // [-] [qty] [+]
  const minusQty = Math.max(1, clampedQty - 1);
  const plusQty = Math.min(effectiveMax, clampedQty + 1);

  kb.text("➖", `qty_${productId}_${minusQty}`)
    .text(`🔢 ${clampedQty}`, "noop")
    .text("➕", `qty_${productId}_${plusQty}`).row();

  // Presets strictly limited to [1], [5], [10]
  const presets = [1, 5, 10].filter((n) => n <= effectiveMax);
  if (presets.length > 0) {
    for (const val of presets) {
      kb.text(val === clampedQty ? `✅ ${val}` : `${val}`, `qty_${productId}_${val}`);
    }
    kb.row();
  }

  // Action Buttons
  kb.text(`✍️ Custom Quantity (၁ မှ ${effectiveMax} ထိ)`, `custom_qty_${productId}`).row()
    .text(`💳 Buy Now • ${formatMmk(totalMmk)}`, `buy_${productId}_${clampedQty}`).row()
    .text("🔙 Back to Products", "menu_categories");

  return kb;
}

/**
 * Wallet Top-Up Payment Options
 */
export const walletPaymentKeyboard = new InlineKeyboard()
  .text("🟢 KBZPay ဖြင့် ငွေဖြည့်မည်", "topup_kpay").row()
  .text("🟡 WavePay ဖြင့် ငွေဖြည့်မည်", "topup_wave").row()
  .text("🔙 Back to Menu", "menu_main");

/**
 * Cancel / Back Keyboard
 */
export const cancelToMainKeyboard = new InlineKeyboard()
  .text("❌ Cancel (မလုပ်တော့ပါ)", "menu_main");
