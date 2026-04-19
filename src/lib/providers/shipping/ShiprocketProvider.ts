import type { IShippingProvider } from "@/lib/providers/shipping/ShippingProvider.interface";

interface ShiprocketAuthResponse {
  token?: string;
}

interface ShiprocketCreateResponse {
  shipment_id?: string | number;
  awb_code?: string;
}

interface ShiprocketTrackResponse {
  tracking_data?: {
    tracking_url?: string;
    shipment_track?: Array<{ current_status?: string; courier_name?: string; activity?: string; location?: string; date?: string; awb_code?: string; sr_status?: string }>;
  };
}

export class ShiprocketProvider implements IShippingProvider {
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  private async getToken(): Promise<string> {
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) return this.token;
    const email = cleanEnvValue(process.env.SHIPROCKET_API_EMAIL) || cleanEnvValue(process.env.SHIPROCKET_EMAIL);
    const password = cleanEnvValue(process.env.SHIPROCKET_API_PASSWORD) || cleanEnvValue(process.env.SHIPROCKET_PASSWORD);
    if (!email || !password) {
      throw new Error(
        "SHIPROCKET_AUTH_FAILED: Missing Shiprocket credentials. Set SHIPROCKET_API_EMAIL/SHIPROCKET_API_PASSWORD (recommended) or SHIPROCKET_EMAIL/SHIPROCKET_PASSWORD."
      );
    }

    const res = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!res.ok) {
      const details = await readErrorDetails(res);
      throw new Error(`SHIPROCKET_AUTH_FAILED: ${details}. Verify API User credentials from Shiprocket > Settings > API Users.`);
    }
    const data = (await res.json()) as ShiprocketAuthResponse;
    if (!data.token) throw new Error("SHIPROCKET_TOKEN_MISSING");

    this.token = data.token;
    this.tokenExpiry = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000);
    return this.token;
  }

  async createShipment(order: {
    orderId: string;
    createdAt: string | Date;
    shippingAddress: { name: string; line1: string; city: string; pincode: string; state: string; phone: string };
    items: Array<{ name: string; sku: string; quantity: number; unitPrice: number; hsnCode?: string }>;
    paymentMethod: "cod" | "prepaid";
    totalAmount: number;
    totalWeight?: number;
  }) {
    const token = await this.getToken();
    const safePhone = String(order.shippingAddress.phone ?? "").replace(/\D/g, "").slice(-10) || "9999999999";
    const safePincode = String(order.shippingAddress.pincode ?? "").replace(/\D/g, "").slice(0, 6);
    const payload = {
      order_id: order.orderId,
      order_date: formatShiprocketDate(order.createdAt),
      pickup_location: "Primary",
      billing_customer_name: order.shippingAddress.name,
      billing_last_name: "",
      billing_address: order.shippingAddress.line1,
      billing_city: order.shippingAddress.city,
      billing_pincode: safePincode,
      billing_state: order.shippingAddress.state,
      billing_country: "India",
      billing_email: "customer@lumenskart.local",
      billing_phone: safePhone,
      shipping_is_billing: true,
      order_items: order.items.map((item) => ({
        name: item.name,
        sku: item.sku,
        units: item.quantity,
        selling_price: item.unitPrice,
        hsn: item.hsnCode ?? "",
      })),
      payment_method: order.paymentMethod === "cod" ? "COD" : "Prepaid",
      sub_total: order.totalAmount,
      length: 10,
      breadth: 10,
      height: 10,
      weight: order.totalWeight ?? 0.5,
    };

    const res = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const details = await readErrorDetails(res);
      throw new Error(`SHIPROCKET_CREATE_FAILED: ${details}`);
    }
    const data = (await res.json()) as ShiprocketCreateResponse;
    return { shipmentId: String(data.shipment_id ?? ""), awbCode: data.awb_code ?? "" };
  }

  async trackShipment(input: { awbCode: string }) {
    const token = await this.getToken();
    const res = await fetch(`https://apiv2.shiprocket.in/v1/external/courier/track/awb/${encodeURIComponent(input.awbCode)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const details = await readErrorDetails(res);
      throw new Error(`SHIPROCKET_TRACK_FAILED: ${details}`);
    }
    const data = (await res.json()) as ShiprocketTrackResponse;
    const steps = data.tracking_data?.shipment_track ?? [];
    const first = steps[0];
    return {
      trackingUrl: data.tracking_data?.tracking_url ?? `https://shiprocket.co/tracking/${encodeURIComponent(input.awbCode)}`,
      courierName: first?.courier_name ?? "",
      status: first?.current_status ?? "",
      events: steps.map((step) => ({
        status: step.current_status ?? step.sr_status ?? "",
        activity: step.activity ?? step.current_status ?? "",
        location: step.location ?? "",
        eventTime: step.date ?? "",
      })),
    };
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
    shippingAddress: { name: string; line1: string; city: string; pincode: string; state: string; phone: string };
    items: Array<{ name: string; sku: string; quantity: number; unitPrice: number; hsnCode?: string }>;
    paymentMethod: "cod" | "prepaid";
    totalAmount: number;
    totalWeight?: number;
  }) {
    const suffix = String(order.orderId).replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "MOCK0001";
    return {
      shipmentId: `MOCK-SHP-${suffix}`,
      awbCode: `MOCK-AWB-${suffix}`,
    };
  }

  async trackShipment(input: { awbCode: string }) {
    return {
      trackingUrl: `https://shiprocket.co/tracking/${encodeURIComponent(input.awbCode)}`,
      courierName: "Mock Courier",
      status: "Shipped",
      events: [
        {
          status: "confirmed",
          activity: "Order confirmed",
          location: "Warehouse",
          eventTime: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
        },
        {
          status: "shipped",
          activity: "Package shipped",
          location: "Transit Hub",
          eventTime: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        },
      ],
    };
  }
}

function formatShiprocketDate(input: string | Date) {
  const date = new Date(input);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
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

