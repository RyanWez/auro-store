import { NextResponse } from "next/server";
import { bot } from "@/bot";

export const dynamic = "force-dynamic";

/**
 * Proxy Telegram Slip Photos safely without exposing Bot Token to client
 * GET /api/admin/slips/image?fileId=...
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return new NextResponse("Missing fileId", { status: 400 });
    }

    const file = await bot.api.getFile(fileId);
    if (!file.file_path) {
      return new NextResponse("File path not found", { status: 404 });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

    const res = await fetch(fileUrl);
    if (!res.ok) {
      return new NextResponse("Failed to fetch image from Telegram", { status: 502 });
    }

    const arrayBuffer = await res.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error: any) {
    return new NextResponse(error.message || "Internal server error", { status: 500 });
  }
}
