/**
 * Text formatting and sanitization utilities for Aura Store
 */

/**
 * Strips Telegram custom premium emoji tags like `{pe:4956506857901392912}`
 * from upstream category/product titles and descriptions, while preserving
 * standard Unicode emojis and clean text.
 */
export function sanitizeUpstreamText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    // Replace custom emoji tags like {pe:123456789} with clean space
    .replace(/\{pe:[0-9]+\}\s*/g, "")
    // Clean up excessive blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Formats a number to Myanmar Kyat currency string (e.g., "2,500 Ks")
 */
export function formatMmk(amount: number): string {
  const rounded = Math.round(amount);
  return `${rounded.toLocaleString()} Ks`;
}

/**
 * Formats a USD amount with 2 decimal places (e.g., "$0.45")
 */
export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Generates an idempotent external order ID
 * Format: aura_ord_<timestamp>_<userId>_<randomHex>
 */
export function generateExternalOrderId(userId: number | string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return `aura_ord_${timestamp}_${userId}_${randomSuffix}`;
}
