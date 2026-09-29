import { webhookCallback } from "grammy";
import { bot } from "@/bot";

export const dynamic = "force-dynamic";

/**
 * Telegram Bot Webhook Handler (Vercel Serverless Function)
 */
export const POST = webhookCallback(bot, "std/http");
