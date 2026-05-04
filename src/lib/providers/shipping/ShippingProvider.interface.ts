export interface IShippingProvider {
  createShipment(order: {
    orderId: string;
    createdAt: string | Date;
    customerEmail?: string;
    shippingAddress: {
      name: string;
      line1: string;
      line2?: string;
      city: string;
      pincode: string;
      state: string;
      phone: string;
    };
    items: Array<{ name: string; sku: string; quantity: number; unitPrice: number; hsnCode?: string; productId?: string }>;
    paymentMethod: "cod" | "prepaid";
    subtotal?: number;
    totalAmount: number;
    totalWeight?: number;
  }): Promise<{
    success: boolean;
    shipmentId: string;
    shiprocketShipmentId: string;
    awbCode: string;
    courier?: string;
    estimatedDelivery?: string;
    error?: string;
  }>;

  getTrackingEvents(input: { awbCode: string }): Promise<{
    events: Array<{ status: string; activity: string; description?: string; location: string; eventTime?: string }>;
    currentStatus: string;
    trackingUrl: string;
    courierName: string;
  }>;

  trackShipment(input: { awbCode: string }): Promise<{
    trackingUrl: string;
    courierName: string;
    status: string;
    currentStatus?: string;
    events: Array<{ status: string; activity: string; description?: string; location: string; eventTime?: string }>;
  }>;
}

