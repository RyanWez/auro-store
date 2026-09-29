import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bot } from "@/bot";

export const dynamic = "force-dynamic";

/**
 * GET: Fetch all deposit slips
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    const slips = await prisma.depositSlip.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            telegramId: true,
            username: true,
            firstName: true,
            lastName: true,
            mmkBalance: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Serialize BigInt to string
    const serializedSlips = slips.map((s) => ({
      ...s,
      user: {
        ...s.user,
        telegramId: s.user.telegramId ? s.user.telegramId.toString() : null,
      },
    }));

    return NextResponse.json({ ok: true, data: serializedSlips });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: Handle Slip Approve / Reject
 */
export async function POST(req: Request) {
  try {
    const { slipId, action, amountMmk, note } = await req.json();

    const slip = await prisma.depositSlip.findUnique({
      where: { id: slipId },
      include: { user: true },
    });

    if (!slip) {
      return NextResponse.json({ ok: false, error: "Slip not found" }, { status: 404 });
    }

    if (action === "APPROVE") {
      const depositAmount = parseFloat(amountMmk) || slip.amountMmk;
      if (depositAmount <= 0) {
        return NextResponse.json({ ok: false, error: "Please enter a valid deposit amount" }, { status: 400 });
      }

      await prisma.$transaction([
        prisma.depositSlip.update({
          where: { id: slipId },
          data: {
            status: "APPROVED",
            amountMmk: depositAmount,
            adminNote: note || null,
            approvedAt: new Date(),
          },
        }),
        prisma.user.update({
          where: { id: slip.userId },
          data: { mmkBalance: { increment: depositAmount } },
        }),
      ]);

      // Notify customer via Telegram
      try {
        await bot.api.sendMessage(
          Number(slip.user.telegramId),
          `✅ **ငွေဖြည့်သွင်းမှု အောင်မြင်ပါသည်!**\n\n💰 ပမာဏ: **${depositAmount.toLocaleString()} MMK** ကို သင့် Wallet ထဲသို့ ထည့်သွင်းပေးပြီးပါပြီ။\n\nကျေးဇူးတင်ပါသည်ခင်ဗျာ! 🎉`,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error("Failed to notify user:", err);
      }

      return NextResponse.json({ ok: true, status: "APPROVED" });
    } else {
      await prisma.depositSlip.update({
        where: { id: slipId },
        data: {
          status: "REJECTED",
          adminNote: note || "ငွေလွှဲစလစ် အတည်မပြုနိုင်ပါ",
        },
      });

      // Notify rejection
      try {
        await bot.api.sendMessage(
          Number(slip.user.telegramId),
          `❌ **ငွေဖြည့်သွင်းမှု ပယ်ချခံရပါသည်**\n\nအကြောင်းပြချက်: ${note || "ငွေလွှဲစလစ် အတည်မပြုနိုင်ပါ"}\nအကူအညီ လိုအပ်ပါက Admin Support သို့ ဆက်သွယ်ပေးပါခင်ဗျာ။`,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error("Failed to notify user:", err);
      }

      return NextResponse.json({ ok: true, status: "REJECTED" });
    }
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
