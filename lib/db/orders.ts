import { prisma } from "@/lib/prisma";
import { upstreamApi, UpstreamClient, UpstreamApiError } from "@/lib/upstream";
import { generateExternalOrderId } from "@/lib/utils/formatters";

export interface ExecuteOrderParams {
  userId: number;
  productId: number; // Internal DB product ID
  quantity: number;
  upstreamClient?: UpstreamClient;
  externalOrderId?: string;
}

export interface OrderExecutionResult {
  ok: boolean;
  orderId: number;
  externalOrderId: string;
  productName: string;
  quantity: number;
  totalMmkPrice: number;
  deliveryLines: string[];
  remainingMmkBalance: number;
}

/**
 * Executes atomic order fulfillment:
 * 1. Verifies user balance & stock
 * 2. Calls Upstream Partner API with idempotent key
 * 3. Atomically deducts customer MMK balance and saves Order record
 */
export async function executeAtomicOrderPurchase(
  params: {
    userId: number;
    productId: number;
    quantity: number;
    upstreamClient?: UpstreamClient;
    externalOrderId?: string;
  },
  client = prisma
): Promise<OrderExecutionResult> {
  const { userId, productId, quantity } = params;
  const upstream = params.upstreamClient || upstreamApi;

  if (quantity < 1) {
    throw new Error("Quantity must be at least 1");
  }

  // 1. Fetch user and product
  const [user, product] = await Promise.all([
    client.user.findUnique({ where: { id: userId } }),
    client.product.findUnique({ where: { id: productId } }),
  ]);

  if (!user) throw new Error("Customer account not found");
  if (user.isBanned) throw new Error("Customer account is suspended");
  if (!product) throw new Error("Product not found");
  if (!product.isVisible || !product.inStock) throw new Error("Product is currently unavailable or out of stock");

  const totalMmk = product.mmkPrice * quantity;

  // 2. Balance Check
  if (user.mmkBalance < totalMmk) {
    const requiredShortage = totalMmk - user.mmkBalance;
    throw new Error(
      `Insufficient wallet balance. Required: ${totalMmk.toLocaleString()} MMK, Balance: ${user.mmkBalance.toLocaleString()} MMK (Short: ${requiredShortage.toLocaleString()} MMK)`
    );
  }

  // 3. Generate idempotent external order ID
  const extOrderId = params.externalOrderId || generateExternalOrderId(user.id);

  // 4. Call Upstream API (If this fails, customer's wallet remains 100% untouched)
  const upstreamRes = await upstream.createOrder({
    productId: product.upstreamId,
    quantity,
    externalOrderId: extOrderId,
  });

  if (!upstreamRes.ok || !upstreamRes.delivery?.lines?.length) {
    throw new UpstreamApiError(
      upstreamRes.error?.message || "Failed to receive delivery credentials from upstream partner",
      upstreamRes.error?.code || "DELIVERY_EMPTY"
    );
  }

  const deliveryLines = upstreamRes.delivery.lines;
  const wholesaleCostUsd = (upstreamRes.order?.unitPrice ?? product.upstreamPriceUsd) * quantity;

  // 5. Atomic DB Transaction (Deduct balance + Create Order)
  const [updatedUser, createdOrder] = await client.$transaction([
    client.user.update({
      where: { id: user.id },
      data: {
        mmkBalance: { decrement: totalMmk },
        totalSpent: { increment: totalMmk },
      },
    }),
    client.order.create({
      data: {
        externalOrderId: extOrderId,
        upstreamOrderId: upstreamRes.order?.orderId ?? null,
        userId: user.id,
        productId: product.id,
        productName: product.name,
        quantity,
        unitMmkPrice: product.mmkPrice,
        totalMmkPrice: totalMmk,
        costUsd: wholesaleCostUsd,
        profitMmk: totalMmk - wholesaleCostUsd * 4850, // estimated
        deliveryLines,
        status: "COMPLETED",
      },
    }),
  ]);

  return {
    ok: true,
    orderId: createdOrder.id,
    externalOrderId: extOrderId,
    productName: product.name,
    quantity,
    totalMmkPrice: totalMmk,
    deliveryLines,
    remainingMmkBalance: updatedUser.mmkBalance,
  };
}

/**
 * Retrieve user order history
 */
export async function getUserOrders(
  userId: number,
  params?: { limit?: number; offset?: number },
  client = prisma
) {
  return client.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: params?.limit || 20,
    skip: params?.offset || 0,
    include: { product: true },
  });
}

/**
 * Retrieve single order details
 */
export async function getOrderById(orderId: number, client = prisma) {
  return client.order.findUnique({
    where: { id: orderId },
    include: { product: true, user: true },
  });
}
