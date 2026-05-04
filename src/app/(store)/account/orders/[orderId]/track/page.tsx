import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireUser";
import { connectDB } from "@/lib/db/mongoose";
import { Order } from "@/lib/db/models/Order.model";
import { isMockAWB } from "@/lib/providers/shipping/awb";

interface Props {
  params: Promise<{ orderId: string }>;
}

export default async function TrackOrderPage({ params }: Props) {
  const { user } = await requireUser();
  if (!user?._id) redirect("/sign-in?redirect_url=/account/orders");

  const { orderId } = await params;
  await connectDB();
  const order = await Order.findOne({ user: user._id, orderId }).select("orderId trackingUrl awbCode").lean();
  if (!order) redirect("/account/orders");

  if (order.awbCode && !isMockAWB(order.awbCode)) {
    const href = order.trackingUrl || `https://shiprocket.co/tracking/${encodeURIComponent(order.awbCode)}`;
    redirect(href);
  }

  redirect(`/account/orders/${orderId}`);
}

