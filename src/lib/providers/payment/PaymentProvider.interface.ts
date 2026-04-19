export interface CreateOrderParams {
  amount: number; // INR
  currency: string;
  orderId: string;
  customerEmail: string;
  customerPhone: string;
  customerName: string;
}

export interface PaymentVerifyParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface IPaymentProvider {
  createOrder(params: CreateOrderParams): Promise<{ providerOrderId: string; amount: number; currency: string }>;
  verifyPayment(params: PaymentVerifyParams): Promise<boolean>;
}

