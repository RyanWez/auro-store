import { upstreamApi } from "./upstream";
import { prisma } from "./prisma";

export async function syncUpstreamCatalog() {
  const [balanceRes, categoriesRes, productsRes, rateSetting, marginSetting] =
    await Promise.all([
      upstreamApi.getBalance().catch(() => ({ ok: false, balance: "0.00" })),
      upstreamApi.getCategories().catch(() => []),
      upstreamApi.getProducts({ limit: 200 }).catch(() => ({ products: [], total: 0 })),
      prisma.setting.findUnique({ where: { key: "usd_exchange_rate" } }).catch(() => null),
      prisma.setting.findUnique({ where: { key: "profit_margin_pct" } }).catch(() => null),
    ]);

  const exchangeRate = parseFloat(rateSetting?.value || "4850");
  const marginPct = parseFloat(marginSetting?.value || "25");

  // Initialize settings if they don't exist
  if (!rateSetting) {
    await prisma.setting.upsert({
      where: { key: "usd_exchange_rate" },
      update: {},
      create: {
        key: "usd_exchange_rate",
        value: "4850",
        description: "USD to MMK market exchange rate",
      },
    }).catch(() => {});
  }
  if (!marginSetting) {
    await prisma.setting.upsert({
      where: { key: "profit_margin_pct" },
      update: {},
      create: {
        key: "profit_margin_pct",
        value: "80",
        description: "Default markup profit percentage",
      },
    }).catch(() => {});
  }

  // Parse categories (supports both direct array and { data: [] })
  const rawCategories: any[] = Array.isArray(categoriesRes)
    ? categoriesRes
    : (categoriesRes as any)?.data || [];

  const categoryMap = new Map<number, number>();

  for (const cat of rawCategories) {
    const name = cat.cleanName || cat.name;
    const upserted = await prisma.category.upsert({
      where: { upstreamId: cat.categoryId },
      update: { name },
      create: {
        upstreamId: cat.categoryId,
        name,
      },
    });
    categoryMap.set(cat.categoryId, upserted.id);
  }

  // Parse products (supports both { products: [] } and { data: [] })
  const rawProducts: any[] = (productsRes as any)?.products || (productsRes as any)?.data || [];

  let syncedProductsCount = 0;
  for (const prod of rawProducts) {
    const usdPrice = prod.yourPrice ?? prod.price ?? 0;
    const calculatedMmk = Math.ceil((usdPrice * exchangeRate * (1 + marginPct / 100)) / 100) * 100;
    const localCategoryId = prod.categoryId ? (categoryMap.get(prod.categoryId) ?? null) : null;
    const name = prod.cleanName || prod.name;
    const description = prod.cleanDescription || prod.description || "";

    await prisma.product.upsert({
      where: { upstreamId: prod.productId },
      update: {
        name,
        description,
        upstreamPriceUsd: usdPrice,
        stock: prod.stock ?? 0,
        inStock: prod.inStock ?? ((prod.stock ?? 0) > 0),
        categoryId: localCategoryId,
        ...(!prod.isCustomPrice ? { mmkPrice: calculatedMmk } : {}),
      },
      create: {
        upstreamId: prod.productId,
        name,
        description,
        upstreamPriceUsd: usdPrice,
        mmkPrice: calculatedMmk,
        stock: prod.stock ?? 0,
        inStock: prod.inStock ?? ((prod.stock ?? 0) > 0),
        categoryId: localCategoryId,
        deliveryType: prod.deliveryType || "TEXT",
      },
    });
    syncedProductsCount++;
  }

  return {
    ok: true,
    balance: (balanceRes as any)?.balance || "0.00",
    syncedCategories: rawCategories.length,
    syncedProducts: syncedProductsCount,
  };
}
