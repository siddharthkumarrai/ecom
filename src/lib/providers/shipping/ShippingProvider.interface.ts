export interface IShippingProvider {
  createShipment(order: {
    orderId: string;
    createdAt: string | Date;
    shippingAddress: {
      name: string;
      line1: string;
      city: string;
      pincode: string;
      state: string;
      phone: string;
    };
    items: Array<{ name: string; sku: string; quantity: number; unitPrice: number; hsnCode?: string }>;
    paymentMethod: "cod" | "prepaid";
    totalAmount: number;
    totalWeight?: number;
  }): Promise<{ shipmentId: string; awbCode: string }>;
  trackShipment(input: { awbCode: string }): Promise<{
    trackingUrl: string;
    courierName: string;
    status: string;
    events: Array<{ status: string; activity: string; location: string; eventTime?: string }>;
  }>;
}

