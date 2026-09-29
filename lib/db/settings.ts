import { prisma } from "@/lib/prisma";

export const DEFAULT_SETTINGS: Record<string, string> = {
  usd_exchange_rate: "4850",
  profit_margin_pct: "25",
  max_purchase_limit: "10", // တစ်ကြိမ်လျှင် အများဆုံး ဝယ်ယူနိုင်သော အရေအတွက်
  kpay_phone: "09123456789",
  kpay_name: "Aura Store Pay",
  wave_phone: "09123456789",
  wave_name: "Aura Store Pay",
  support_contact: "@AuraStoreSupport",
  channel_link: "https://t.me/AuraStoreOfficial",
};

/**
 * Get single setting with fallback to default
 */
export async function getSetting(key: string, defaultValue?: string, client = prisma): Promise<string> {
  const record = await client.setting.findUnique({ where: { key } });
  return record?.value ?? defaultValue ?? DEFAULT_SETTINGS[key] ?? "";
}

/**
 * Set single setting value
 */
export async function setSetting(key: string, value: string, description?: string, client = prisma) {
  return client.setting.upsert({
    where: { key },
    update: { value, description },
    create: { key, value, description },
  });
}

/**
 * Get all settings as a key-value dictionary
 */
export async function getAllSettings(client = prisma): Promise<Record<string, string>> {
  const records = await client.setting.findMany();
  const map: Record<string, string> = { ...DEFAULT_SETTINGS };

  for (const rec of records) {
    map[rec.key] = rec.value;
  }

  return map;
}

/**
 * Get numeric pricing settings (exchange rate, profit margin, max purchase limit)
 */
export async function getPricingSettings(client = prisma) {
  const [rateStr, marginStr, maxLimitStr] = await Promise.all([
    getSetting("usd_exchange_rate", "4850", client),
    getSetting("profit_margin_pct", "25", client),
    getSetting("max_purchase_limit", "10", client),
  ]);

  return {
    usdExchangeRate: parseFloat(rateStr) || 4850,
    profitMarginPct: parseFloat(marginStr) || 25,
    maxPurchaseLimit: parseInt(maxLimitStr, 10) || 10,
  };
}

/**
 * Get payment and contact configuration
 */
export async function getPaymentSettings(client = prisma) {
  const settings = await getAllSettings(client);
  return {
    kpayPhone: settings.kpay_phone || "09123456789",
    kpayName: settings.kpay_name || "Aura Store Pay",
    wavePhone: settings.wave_phone || "09123456789",
    waveName: settings.wave_name || "Aura Store Pay",
    supportContact: settings.support_contact || "@AuraStoreSupport",
    channelLink: settings.channel_link || "https://t.me/AuraStoreOfficial",
  };
}
