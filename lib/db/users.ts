import { prisma } from "@/lib/prisma";

export interface UserProfileInput {
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

/**
 * Retrieves existing user or creates a new one upon /start
 */
export async function getOrCreateUser(
  telegramId: bigint | number,
  profile?: UserProfileInput,
  client = prisma
) {
  const tId = typeof telegramId === "number" ? BigInt(telegramId) : telegramId;

  return client.user.upsert({
    where: { telegramId: tId },
    update: {
      username: profile?.username ?? undefined,
      firstName: profile?.firstName ?? undefined,
      lastName: profile?.lastName ?? undefined,
    },
    create: {
      telegramId: tId,
      username: profile?.username ?? null,
      firstName: profile?.firstName ?? null,
      lastName: profile?.lastName ?? null,
      mmkBalance: 0,
      totalSpent: 0,
    },
  });
}

/**
 * Get user by Telegram ID
 */
export async function getUserByTelegramId(telegramId: bigint | number, client = prisma) {
  const tId = typeof telegramId === "number" ? BigInt(telegramId) : telegramId;
  return client.user.findUnique({
    where: { telegramId: tId },
  });
}

/**
 * Get user by database internal ID
 */
export async function getUserById(id: number, client = prisma) {
  return client.user.findUnique({
    where: { id },
  });
}

/**
 * Adjust user MMK balance with safety floor check
 */
export async function adjustUserBalance(
  userId: number,
  deltaMmk: number,
  client = prisma
) {
  const user = await client.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error(`User with ID ${userId} not found`);

  const newBalance = user.mmkBalance + deltaMmk;
  if (newBalance < 0) {
    throw new Error(`Insufficient balance: Current ${user.mmkBalance} MMK, required deduction ${Math.abs(deltaMmk)} MMK`);
  }

  return client.user.update({
    where: { id: userId },
    data: {
      mmkBalance: { increment: deltaMmk },
      ...(deltaMmk < 0 ? { totalSpent: { increment: Math.abs(deltaMmk) } } : {}),
    },
  });
}

/**
 * Get user summary stats (balance, spent, orders, slips)
 */
export async function getUserStats(userId: number, client = prisma) {
  const [user, ordersCount, pendingSlipsCount] = await Promise.all([
    client.user.findUnique({ where: { id: userId } }),
    client.order.count({ where: { userId, status: "COMPLETED" } }),
    client.depositSlip.count({ where: { userId, status: "PENDING" } }),
  ]);

  return {
    user,
    ordersCount,
    pendingSlipsCount,
  };
}
