import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/requireUser";
import { connectDB } from "@/lib/db/mongoose";
import { Order } from "@/lib/db/models/Order.model";
import OrderTrackingLiveClient, { type OrderTrackingView } from "@/components/store/account/OrderTrackingLiveClient";

interface Props {
  params: Promise<{ orderId: string }>;
}

export default async function OrderTrackingDetailsPage({ params }: Props) {
  const { user } = await requireUser();
  if (!user?._id) notFound();

  const { orderId } = await params;
  await connectDB();
  const order = await Order.findOne({ user: user._id, orderId })
    .select("orderId createdAt updatedAt items totalAmount shippingAddress deliveryStatus paymentMethod paymentStatus awbCode courierName trackingUrl trackingEvents")
    .lean();

  if (!order) notFound();

  const initial: OrderTrackingView = {
    orderId: order.orderId,
    createdAt: order.createdAt,
    items: (order.items ?? []).map((item) => ({ name: item.name, image: item.image ?? "" })),
    totalAmount: order.totalAmount ?? 0,
    shippingAddress: {
      name: order.shippingAddress?.name ?? "",
      line1: order.shippingAddress?.line1 ?? "",
      city: order.shippingAddress?.city ?? "",
      state: order.shippingAddress?.state ?? "",
      pincode: order.shippingAddress?.pincode ?? "",
      phone: order.shippingAddress?.phone ?? "",
    },
    deliveryStatus: order.deliveryStatus ?? "pending",
    paymentMethod: order.paymentMethod ?? "",
    paymentStatus: order.paymentStatus ?? "",
    awbCode: order.awbCode ?? "",
    courierName: order.courierName ?? "",
    trackingUrl: order.trackingUrl ?? "",
    trackingEvents: (order.trackingEvents ?? []).map((event) => ({
      status: event.status ?? "",
      activity: event.activity ?? "",
      location: event.location ?? "",
      eventTime: event.eventTime ? new Date(event.eventTime).toISOString() : null,
    })),
  };

  return <OrderTrackingLiveClient initial={initial} />;
}
