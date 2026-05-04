import type { IShippingProvider } from "@/lib/providers/shipping/ShippingProvider.interface";
import { validateShiprocketEnv } from "@/lib/providers/shipping/validateShiprocketEnv";

const SHIPROCKET_BASE_URL = "https://apiv2.shiprocket.in/v1/external/";
const SHIPROCKET_TOKEN_TTL_SECONDS = 777600; // 9 days
const SHIPROCKET_TOKEN_KEY = "shiprocket_token";

let cachedToken: { token: string; expiresAt: number } | null = null;

interface ShiprocketAuthResponse {
  token?: string;
}

interface ShiprocketCreateResponse {
  shipment_id?: string | number;
  awb_code?: string;
  courier_name?: string;
  expected_delivery_date?: string;
  data?: {
    shipment_id?: string | number;
    awb_code?: string;
    courier_name?: string;
    expected_delivery_date?: string;
  };
}

interface ShiprocketAwbAssignResponse {
  awb_code?: string;
  response?: { data?: { awb_code?: string } };
  data?: { awb_code?: string };
}

interface ShiprocketTrackResponse {
  tracking_data?: {
    tracking_url?: string;
    shipment_track?: Array<{ current_status?: string; courier_name?: string }>;
    shipment_track_activities?: Array<{
      date?: string;
      activity?: string;
      description?: string;
      location?: string;
    }>;
  };
}

export class ShiprocketProvider implements IShippingProvider {
  constructor() {
    const validation = validateShiprocketEnv();
    if (!validation.valid) {
      throw new Error("Shiprocket not configured. Set SHIPROCKET_API_EMAIL and SHIPROCKET_API_PASSWORD or use SHIPROCKET_MOCK_MODE=true");
    }
  }

  async createShipment(order: {
    orderId: string;
    createdAt: string | Date;
    customerEmail?: string;
    shippingAddress: { name: string; line1: string; line2?: string; city: string; pincode: string; state: string; phone: string };
    items: Array<{ name: string; sku: string; quantity: number; unitPrice: number; hsnCode?: string; productId?: string }>;
    paymentMethod: "cod" | "prepaid";
    subtotal?: number;
    totalAmount: number;
    totalWeight?: number;
  }) {
    const safePhone = String(order.shippingAddress.phone ?? "").replace(/\D/g, "").slice(-10) || "9999999999";
    const safePincode = String(order.shippingAddress.pincode ?? "").replace(/\D/g, "").slice(0, 6);
    const pickupLocation = cleanEnvValue(process.env.SHIPROCKET_PICKUP_LOCATION) || "Primary";
    const payload = {
      order_id: order.orderId,
      order_date: formatShiprocketDate(order.createdAt),
      pickup_location: pickupLocation,
      channel_id: "",
      comment: "YaduInfotech Order",
      billing_customer_name: order.shippingAddress.name,
      billing_last_name: "",
      billing_address: order.shippingAddress.line1,
      billing_address_2: order.shippingAddress.line2 || "",
      billing_city: order.shippingAddress.city,
      billing_pincode: safePincode,
      billing_state: order.shippingAddress.state,
      billing_country: "India",
      billing_email: order.customerEmail || "",
      billing_phone: safePhone,
      shipping_is_billing: true,
      order_items: order.items.map((item) => ({
        name: item.name,
        sku: item.productId || item.sku || "SKU001",
        units: item.quantity,
        selling_price: String(item.unitPrice),
        discount: "",
        tax: "",
        hsn: item.hsnCode || "",
      })),
      payment_method: order.paymentMethod === "cod" ? "COD" : "Prepaid",
      sub_total: order.subtotal ?? order.totalAmount,
      length: 10,
      width: 10,
      breadth: 10,
      height: 10,
      weight: order.totalWeight ?? 0.5,
    };

    const res = await this.request("orders/create/adhoc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const details = await readErrorDetails(res);
      throw new Error(`SHIPROCKET_CREATE_FAILED: ${details}`);
    }

    const data = (await res.json()) as ShiprocketCreateResponse;
    const shipmentId = String(data.shipment_id ?? data.data?.shipment_id ?? "");
    if (!shipmentId) throw new Error("SHIPROCKET_CREATE_FAILED: shipment_id missing");

    let awbCode = String(data.awb_code ?? data.data?.awb_code ?? "");
    if (!awbCode) {
      const assignRes = await this.request("courier/assign/awb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipment_id: Number(shipmentId) || shipmentId }),
      });

      if (assignRes.ok) {
        const assignData = (await assignRes.json()) as ShiprocketAwbAssignResponse;
        awbCode = String(assignData.awb_code ?? assignData.response?.data?.awb_code ?? assignData.data?.awb_code ?? "");
      }
    }

    return {
      success: true,
      shipmentId,
      shiprocketShipmentId: shipmentId,
      awbCode,
      courier: data.courier_name ?? data.data?.courier_name ?? "Shiprocket",
      estimatedDelivery: data.expected_delivery_date ?? data.data?.expected_delivery_date ?? "",
    };
  }

  async getTrackingEvents(input: { awbCode: string }) {
    try {
      const res = await this.request(`courier/track/awb/${encodeURIComponent(input.awbCode)}`, { method: "GET" });
      if (res.status === 404) {
        return {
          events: [],
          currentStatus: "unknown",
          trackingUrl: `https://shiprocket.co/tracking/${encodeURIComponent(input.awbCode)}`,
          courierName: "Shiprocket",
        };
      }
      if (!res.ok) {
        return {
          events: [],
          currentStatus: "unknown",
          trackingUrl: `https://shiprocket.co/tracking/${encodeURIComponent(input.awbCode)}`,
          courierName: "Shiprocket",
        };
      }

      const data = (await res.json()) as ShiprocketTrackResponse;
      const currentStatus = data.tracking_data?.shipment_track?.[0]?.current_status || "unknown";
      const courierName = data.tracking_data?.shipment_track?.[0]?.courier_name || "Shiprocket";
      const trackingUrl = data.tracking_data?.tracking_url || `https://shiprocket.co/tracking/${encodeURIComponent(input.awbCode)}`;
      const activities = data.tracking_data?.shipment_track_activities ?? [];

      if (activities.length === 0) {
        return { events: [], currentStatus: "unknown", trackingUrl, courierName };
      }

      const events = activities
        .map((activity) => ({
          status: activity.activity || "Update",
          activity: activity.description || activity.activity || "Shipment update",
          description: activity.description || activity.activity || "Shipment update",
          location: activity.location || "",
          eventTime: normalizeEventTime(activity.date),
        }))
        .sort((a, b) => toEpoch(a.eventTime) - toEpoch(b.eventTime));

      return {
        events,
        currentStatus,
        trackingUrl,
        courierName,
      };
    } catch {
      return {
        events: [],
        currentStatus: "unknown",
        trackingUrl: `https://shiprocket.co/tracking/${encodeURIComponent(input.awbCode)}`,
        courierName: "Shiprocket",
      };
    }
  }

  async trackShipment(input: { awbCode: string }) {
    const tracked = await this.getTrackingEvents(input);
    return {
      trackingUrl: tracked.trackingUrl,
      courierName: tracked.courierName,
      status: tracked.currentStatus,
      currentStatus: tracked.currentStatus,
      events: tracked.events.map((event) => ({
        status: event.status,
        activity: event.activity,
        description: event.description,
        location: event.location,
        eventTime: event.eventTime,
      })),
    };
  }

  private async getToken() {
    const fromCache = await this.readCachedToken();
    if (fromCache) return fromCache;

    const email = cleanEnvValue(process.env.SHIPROCKET_API_EMAIL) || cleanEnvValue(process.env.SHIPROCKET_EMAIL);
    const password = cleanEnvValue(process.env.SHIPROCKET_API_PASSWORD) || cleanEnvValue(process.env.SHIPROCKET_PASSWORD);
    if (!email || !password) {
      throw new Error(
        "SHIPROCKET_AUTH_FAILED: Missing Shiprocket credentials. Set SHIPROCKET_API_EMAIL/SHIPROCKET_API_PASSWORD (recommended) or SHIPROCKET_EMAIL/SHIPROCKET_PASSWORD."
      );
    }

    const res = await fetch(`${SHIPROCKET_BASE_URL}auth/local/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    if (!res.ok) {
      const details = await readErrorDetails(res);
      throw new Error(`SHIPROCKET_AUTH_FAILED: ${details}. Verify API User credentials from Shiprocket > Settings > API Users.`);
    }
    const data = (await res.json()) as ShiprocketAuthResponse;
    if (!data.token) throw new Error("SHIPROCKET_TOKEN_MISSING");

    await this.writeCachedToken(data.token);
    return data.token;
  }

  private async request(path: string, init: RequestInit, retryOnUnauthorized = true): Promise<Response> {
    const token = await this.getToken();
    const headers = new Headers(init.headers ?? {});
    headers.set("Authorization", `Bearer ${token}`);

    const res = await fetch(`${SHIPROCKET_BASE_URL}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });

    if (res.status === 401 && retryOnUnauthorized) {
      await this.clearTokenCache();
      return this.request(path, init, false);
    }

    return res;
  }

  private async readCachedToken() {
    const redisToken = await readTokenFromRedis();
    if (redisToken) {
      cachedToken = { token: redisToken, expiresAt: Date.now() + SHIPROCKET_TOKEN_TTL_SECONDS * 1000 };
      return redisToken;
    }
    if (!cachedToken) return "";
    if (cachedToken.expiresAt <= Date.now()) return "";
    return cachedToken.token;
  }

  private async writeCachedToken(token: string) {
    cachedToken = { token, expiresAt: Date.now() + SHIPROCKET_TOKEN_TTL_SECONDS * 1000 };
    await writeTokenToRedis(token);
  }

  private async clearTokenCache() {
    cachedToken = null;
    await deleteTokenFromRedis();
  }
}

export function getShippingProvider(): IShippingProvider {
  if (String(process.env.SHIPROCKET_MOCK_MODE ?? "").toLowerCase() === "true") {
    return new MockShippingProvider();
  }
  return new ShiprocketProvider();
}

class MockShippingProvider implements IShippingProvider {
  async createShipment(order: {
    orderId: string;
    createdAt: string | Date;
    customerEmail?: string;
    shippingAddress: { name: string; line1: string; line2?: string; city: string; pincode: string; state: string; phone: string };
    items: Array<{ name: string; sku: string; quantity: number; unitPrice: number; hsnCode?: string; productId?: string }>;
    paymentMethod: "cod" | "prepaid";
    subtotal?: number;
    totalAmount: number;
    totalWeight?: number;
  }) {
    const suffix = String(order.orderId).replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "MOCK0001";
    return {
      success: true,
      shipmentId: `MOCK-SHP-${suffix}`,
      shiprocketShipmentId: `MOCK-SHP-${suffix}`,
      awbCode: `MOCK-AWB-${suffix}`,
      courier: "Mock Courier",
      estimatedDelivery: "",
    };
  }

  async getTrackingEvents(input: { awbCode: string }) {
    const now = Date.now();
    const events = [
      {
        status: "Order Confirmed",
        activity: "Order confirmed by admin",
        description: "Order confirmed by admin",
        location: "Warehouse",
        eventTime: new Date(now - 1000 * 60 * 60 * 18).toISOString(),
      },
      {
        status: "Pickup Scheduled",
        activity: "Pickup scheduled",
        description: "Pickup scheduled with courier",
        location: "Warehouse",
        eventTime: new Date(now - 1000 * 60 * 60 * 12).toISOString(),
      },
      {
        status: "In Transit",
        activity: "Shipment in transit",
        description: "Shipment in transit",
        location: "Delhi Hub",
        eventTime: new Date(now - 1000 * 60 * 60 * 6).toISOString(),
      },
      {
        status: "In Transit",
        activity: "Shipment moved to destination city",
        description: "Shipment moved to destination city",
        location: "Local Hub",
        eventTime: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
      },
      {
        status: "Out for Delivery",
        activity: "Out for delivery",
        description: "Package out for delivery in your area",
        location: "Delivery Hub",
        eventTime: new Date(now - 1000 * 60 * 35).toISOString(),
      },
    ];

    void input;
    return {
      trackingUrl: "",
      courierName: "Mock Courier",
      currentStatus: "Out for Delivery",
      events,
    };
  }

  async trackShipment(input: { awbCode: string }) {
    const tracked = await this.getTrackingEvents(input);
    return {
      trackingUrl: tracked.trackingUrl,
      courierName: tracked.courierName,
      status: tracked.currentStatus,
      currentStatus: tracked.currentStatus,
      events: tracked.events,
    };
  }
}

function formatShiprocketDate(input: string | Date) {
  const date = new Date(input);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeEventTime(value?: string) {
  if (!value) return "";
  const epoch = new Date(value).getTime();
  if (!Number.isFinite(epoch)) return "";
  return new Date(epoch).toISOString();
}

function toEpoch(value?: string) {
  if (!value) return 0;
  const epoch = new Date(value).getTime();
  return Number.isFinite(epoch) ? epoch : 0;
}

async function readErrorDetails(res: Response) {
  const text = await res.text().catch(() => "");
  if (!text) return `${res.status}`;
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const message = (parsed.message as string) || (parsed.error as string) || (parsed.status as string);
    return message ? `${res.status} ${message}` : `${res.status} ${text}`;
  } catch {
    return `${res.status} ${text}`;
  }
}

function cleanEnvValue(value: string | undefined) {
  if (!value) return "";
  const trimmed = value.trim();
  return trimmed.replace(/^['"]|['"]$/g, "");
}

async function readTokenFromRedis() {
  const result = await executeUpstashCommand(["GET", SHIPROCKET_TOKEN_KEY]);
  return typeof result === "string" ? result : "";
}

async function writeTokenToRedis(token: string) {
  await executeUpstashCommand(["SET", SHIPROCKET_TOKEN_KEY, token, "EX", SHIPROCKET_TOKEN_TTL_SECONDS]);
}

async function deleteTokenFromRedis() {
  await executeUpstashCommand(["DEL", SHIPROCKET_TOKEN_KEY]);
}

async function executeUpstashCommand(args: Array<string | number>) {
  const url = cleanEnvValue(process.env.UPSTASH_REDIS_REST_URL);
  const token = cleanEnvValue(process.env.UPSTASH_REDIS_REST_TOKEN);
  if (!url || !token) return null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const parsed = (await res.json()) as { result?: unknown };
    return parsed.result ?? null;
  } catch {
    return null;
  }
}

