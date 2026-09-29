/**
 * Aura Store — Upstream Partner API Client
 * Base URL: http://paid2.daki.cc:4153/api/partner/v1
 */

import { sanitizeUpstreamText } from "./utils/formatters";

export interface UpstreamBalance {
  ok: boolean;
  balance: string;
  currency: string;
  userId: number;
}

export interface UpstreamCategory {
  categoryId: number;
  name: string;
  cleanName: string;
}

export interface UpstreamProduct {
  productId: number;
  name: string;
  cleanName: string;
  description: string;
  cleanDescription: string;
  categoryId: number | null;
  deliveryType: "TEXT" | "CREDENTIALS" | "LINK" | string;
  price: number;
  yourPrice: number;
  discountPct: number;
  currency: string;
  stock: number;
  inStock: boolean;
}

export interface CreateOrderPayload {
  productId: number;
  quantity: number;
  externalOrderId: string;
}

export interface UpstreamOrderResponse {
  ok: boolean;
  order?: {
    orderId: number;
    externalOrderId: string;
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
    currency: string;
    status: string;
  };
  delivery?: {
    type: string;
    lines: string[];
  };
  balanceAfter?: string;
  error?: {
    code: string;
    message: string;
    required?: number;
    balance?: number;
  };
}

export class UpstreamApiError extends Error {
  code: string;
  status: number;
  details?: any;

  constructor(message: string, code: string = "API_ERROR", status: number = 500, details?: any) {
    super(message);
    this.name = "UpstreamApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class UpstreamClient {
  private baseUrl: string;
  private apiKey: string;
  private timeoutMs: number;

  constructor(options?: { baseUrl?: string; apiKey?: string; timeoutMs?: number }) {
    this.baseUrl = (options?.baseUrl || process.env.UPSTREAM_API_URL || "http://paid2.daki.cc:4153/api/partner/v1").replace(/\/$/, "");
    this.apiKey = options?.apiKey || process.env.UPSTREAM_API_KEY || "";
    this.timeoutMs = options?.timeoutMs || 15000;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...options.headers,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || (data && data.ok === false)) {
        const errCode = data?.error?.code || `HTTP_${response.status}`;
        const errMsg = data?.error?.message || data?.detail || response.statusText || "Upstream API Error";
        throw new UpstreamApiError(errMsg, errCode, response.status, data);
      }

      return data as T;
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new UpstreamApiError("Upstream API request timed out", "TIMEOUT", 504);
      }
      if (err instanceof UpstreamApiError) {
        throw err;
      }
      throw new UpstreamApiError(err.message || "Failed to communicate with upstream API", "NETWORK_ERROR", 502);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Health Check
   */
  async getHealth(): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>("/health");
  }

  /**
   * Check partner USD balance
   */
  async getBalance(): Promise<UpstreamBalance> {
    return this.request<UpstreamBalance>("/balance");
  }

  /**
   * Fetch and sanitize category list
   */
  async getCategories(): Promise<UpstreamCategory[]> {
    const res = await this.request<{ ok: boolean; data: Array<{ categoryId: number; name: string }> }>("/catalog/categories");
    if (!res.data) return [];

    return res.data.map((cat) => ({
      categoryId: cat.categoryId,
      name: cat.name,
      cleanName: sanitizeUpstreamText(cat.name),
    }));
  }

  /**
   * Fetch and sanitize product catalog
   */
  async getProducts(params?: {
    category?: number;
    search?: string;
    inStock?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ products: UpstreamProduct[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.category) query.set("category", params.category.toString());
    if (params?.search) query.set("search", params.search);
    if (params?.inStock) query.set("inStock", "true");
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.offset) query.set("offset", params.offset.toString());

    const endpoint = `/catalog/products${query.toString() ? `?${query.toString()}` : ""}`;
    const res = await this.request<{ ok: boolean; data: any[]; total?: number }>(endpoint);

    const rawList = res.data || [];
    const products: UpstreamProduct[] = rawList.map((p) => ({
      productId: p.productId,
      name: p.name,
      cleanName: sanitizeUpstreamText(p.name),
      description: p.description || "",
      cleanDescription: sanitizeUpstreamText(p.description),
      categoryId: p.categoryId ?? null,
      deliveryType: p.deliveryType || "TEXT",
      price: p.price ?? 0,
      yourPrice: p.yourPrice ?? p.price ?? 0,
      discountPct: p.discountPct ?? 0,
      currency: p.currency || "USD",
      stock: p.stock ?? 0,
      inStock: p.inStock ?? (p.stock > 0),
    }));

    return {
      products,
      total: res.total ?? products.length,
    };
  }

  /**
   * Fetch single product details
   */
  async getProduct(productId: number): Promise<UpstreamProduct> {
    const res = await this.request<{ ok: boolean; data: any }>(`/catalog/products/${productId}`);
    const p = res.data;
    return {
      productId: p.productId,
      name: p.name,
      cleanName: sanitizeUpstreamText(p.name),
      description: p.description || "",
      cleanDescription: sanitizeUpstreamText(p.description),
      categoryId: p.categoryId ?? null,
      deliveryType: p.deliveryType || "TEXT",
      price: p.price ?? 0,
      yourPrice: p.yourPrice ?? p.price ?? 0,
      discountPct: p.discountPct ?? 0,
      currency: p.currency || "USD",
      stock: p.stock ?? 0,
      inStock: p.inStock ?? (p.stock > 0),
    };
  }

  /**
   * Submit an order with idempotency
   */
  async createOrder(payload: CreateOrderPayload): Promise<UpstreamOrderResponse> {
    if (!payload.productId || payload.quantity < 1 || !payload.externalOrderId) {
      throw new UpstreamApiError("Invalid order parameters", "INVALID_PARAMS", 400);
    }

    return this.request<UpstreamOrderResponse>("/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  /**
   * Retrieve order details & delivery credentials
   */
  async getOrder(orderId: number): Promise<UpstreamOrderResponse> {
    return this.request<UpstreamOrderResponse>(`/orders/${orderId}`);
  }
}

// Global default singleton instance
export const upstreamApi = new UpstreamClient();
