import { prisma } from "@/lib/prisma";

export interface CreateSlipInput {
  userId: number;
  provider: "KBZ_PAY" | "WAVE_PAY" | "MANUAL_BANK";
  amountMmk: number;
  telegramFileId: string;
  transactionId?: string | null;
}

/**
 * Creates a pending deposit slip record when customer uploads screenshot
 */
export async function createDepositSlip(input: CreateSlipInput, client = prisma) {
  return client.depositSlip.create({
    data: {
      userId: input.userId,
      provider: input.provider,
      amountMmk: input.amountMmk,
      telegramFileId: input.telegramFileId,
      transactionId: input.transactionId ?? null,
      status: "PENDING",
    },
    include: {
      user: true,
    },
  });
}

/**
 * Atomically approves a deposit slip and credits user MMK wallet
 */
export async function approveDepositSlip(
  params: {
    slipId: number;
    approvedAmountMmk?: number;
    adminNote?: string;
  },
  client = prisma
) {
  const slip = await client.depositSlip.findUnique({
    where: { id: params.slipId },
    include: { user: true },
  });

  if (!slip) throw new Error(`Deposit slip #${params.slipId} not found`);
  if (slip.status !== "PENDING") {
    throw new Error(`Deposit slip #${params.slipId} is already ${slip.status}`);
  }

  const finalAmount = params.approvedAmountMmk ?? slip.amountMmk;

  return client.$transaction(async (tx) => {
    // 1. Update slip status
    const updatedSlip = await tx.depositSlip.update({
      where: { id: params.slipId },
      data: {
        status: "APPROVED",
        amountMmk: finalAmount,
        adminNote: params.adminNote ?? "Approved by Admin",
        approvedAt: new Date(),
      },
    });

    // 2. Increment user's MMK balance
    const updatedUser = await tx.user.update({
      where: { id: slip.userId },
      data: {
        mmkBalance: { increment: finalAmount },
      },
    });

    return { slip: updatedSlip, user: updatedUser };
  });
}

/**
 * Rejects a deposit slip
 */
export async function rejectDepositSlip(
  params: {
    slipId: number;
    adminNote?: string;
  },
  client = prisma
) {
  const slip = await client.depositSlip.findUnique({
    where: { id: params.slipId },
  });

  if (!slip) throw new Error(`Deposit slip #${params.slipId} not found`);
  if (slip.status !== "PENDING") {
    throw new Error(`Deposit slip #${params.slipId} is already ${slip.status}`);
  }

  return client.depositSlip.update({
    where: { id: params.slipId },
    data: {
      status: "REJECTED",
      adminNote: params.adminNote ?? "Rejected by Admin",
    },
    include: { user: true },
  });
}

/**
 * Retrieves pending slips for Admin review
 */
export async function getPendingSlips(client = prisma) {
  return client.depositSlip.findMany({
    where: { status: "PENDING" },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
}
