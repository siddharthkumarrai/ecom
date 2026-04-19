import { connectDB } from "@/lib/db/mongoose";
import { Order } from "@/lib/db/models/Order.model";
import { Product } from "@/lib/db/models/Product.model";
import { User } from "@/lib/db/models/User.model";
import { error, json } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/requireAdmin";

type OrderStatusCount = { _id: string; count: number };
type PaymentMethodCount = { _id: string; count: number; revenue: number };
type RevenuePoint = { _id: { year: number; month: number; day: number }; revenue: number; orders: number };
type TopProduct = { _id: string; quantity: number; revenue: number; name: string };
const purchasedMatch = () => ({ $or: [{ paymentStatus: "paid" }, { paymentMethod: "cod" }] });

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return error(admin.reason === "unauthorized" ? "Unauthorized" : "Not found", admin.reason === "unauthorized" ? 401 : 404);

  await connectDB();

  const url = new URL(req.url);
  const now = new Date();
  const range = url.searchParams.get("range") ?? "7d";
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const { rangeStart, rangeEnd } = resolveRange({ now, range, from, to });
  const { compareStart, compareEnd } = resolvePreviousWindow({ rangeStart, rangeEnd });
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalOrdersAllTime,
    totalCustomers,
    totalProducts,
    totalOrdersRange,
    revenueTodayAgg,
    revenueWeekAgg,
    revenueMonthAgg,
    recentOrders,
    statusBreakdown,
    paymentBreakdown,
    lowStockProducts,
    revenueSeries,
    topProducts,
    pendingOrders,
  ] = await Promise.all([
    Order.countDocuments(),
    User.countDocuments({ role: "customer" }),
    Product.countDocuments({ isActive: true }),
    Order.countDocuments({ createdAt: { $gte: rangeStart, $lte: rangeEnd } }),
    Order.aggregate<{ total: number }>([
      { $match: { createdAt: { $gte: dayStart }, ...purchasedMatch() } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Order.aggregate<{ total: number }>([
      { $match: { createdAt: { $gte: weekStart }, ...purchasedMatch() } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Order.aggregate<{ total: number }>([
      { $match: { createdAt: { $gte: monthStart }, ...purchasedMatch() } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Order.find().sort({ createdAt: -1 }).limit(10).select("orderId totalAmount paymentStatus deliveryStatus createdAt").lean(),
    Order.aggregate<OrderStatusCount>([{ $group: { _id: "$deliveryStatus", count: { $sum: 1 } } }]),
    Order.aggregate<PaymentMethodCount>([
      { $group: { _id: "$paymentMethod", count: { $sum: 1 }, revenue: { $sum: "$totalAmount" } } },
    ]),
    Product.find({ stock: { $lt: 10 }, isActive: true }).sort({ stock: 1 }).limit(10).select("name sku stock").lean(),
    Order.aggregate<RevenuePoint>([
      { $match: { createdAt: { $gte: rangeStart, $lte: rangeEnd }, ...purchasedMatch() } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" }, day: { $dayOfMonth: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]),
    Order.aggregate<TopProduct>([
      { $unwind: "$items" },
      { $match: { createdAt: { $gte: rangeStart, $lte: rangeEnd }, ...purchasedMatch() } },
      { $group: { _id: "$items.product", quantity: { $sum: "$items.quantity" }, revenue: { $sum: "$items.totalPrice" }, name: { $first: "$items.name" } } },
      { $sort: { quantity: -1 } },
      { $limit: 10 },
    ]),
    Order.countDocuments({ deliveryStatus: { $in: ["pending", "confirmed", "processing"] } }),
  ]);

  const totalOrdersRangePurchased = await Order.countDocuments({ createdAt: { $gte: rangeStart, $lte: rangeEnd }, ...purchasedMatch() });
  const rangeRevenueAgg = await Order.aggregate<{ total: number }>([
    { $match: { createdAt: { $gte: rangeStart, $lte: rangeEnd }, ...purchasedMatch() } },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);
  const compareRevenueAgg = await Order.aggregate<{ total: number }>([
    { $match: { createdAt: { $gte: compareStart, $lte: compareEnd }, ...purchasedMatch() } },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);
  const compareOrders = await Order.countDocuments({ createdAt: { $gte: compareStart, $lte: compareEnd }, ...purchasedMatch() });

  const totalRevenueInRange = rangeRevenueAgg[0]?.total ?? 0;
  const avgOrderValue = totalOrdersRangePurchased > 0 ? round2(totalRevenueInRange / totalOrdersRangePurchased) : 0;
  const compareRevenue = compareRevenueAgg[0]?.total ?? 0;
  const revenueDeltaPercent = percentDelta(compareRevenue, totalRevenueInRange);
  const ordersDeltaPercent = percentDelta(compareOrders, totalOrdersRangePurchased);
  const anomalyAlerts = deriveAnomalies({
    lowStockCount: lowStockProducts.length,
    pendingOrders,
    revenueSeries: revenueSeries.map((point) => round2(point.revenue)),
    revenueDeltaPercent,
  });

  return json({
    generatedAt: now.toISOString(),
    range: {
      preset: range,
      from: rangeStart.toISOString(),
      to: rangeEnd.toISOString(),
    },
    compareRange: {
      from: compareStart.toISOString(),
      to: compareEnd.toISOString(),
    },
    metrics: {
      totalRevenueMonth: round2(revenueMonthAgg[0]?.total ?? 0),
      totalRevenueToday: round2(revenueTodayAgg[0]?.total ?? 0),
      totalRevenueWeek: round2(revenueWeekAgg[0]?.total ?? 0),
      totalRevenueInRange: round2(totalRevenueInRange),
      totalOrders: totalOrdersAllTime,
      totalOrdersInRange: totalOrdersRangePurchased,
      totalOrdersPlacedInRange: totalOrdersRange,
      totalCustomers,
      totalProducts,
      avgOrderValue,
      pendingOrders,
    },
    comparison: {
      compareRevenue: round2(compareRevenue),
      compareOrders,
      revenueDeltaPercent,
      ordersDeltaPercent,
    },
    anomalyAlerts,
    statusBreakdown,
    paymentBreakdown: paymentBreakdown.map((row) => ({ ...row, revenue: round2(row.revenue) })),
    lowStockProducts,
    revenueSeries: revenueSeries.map((point) => ({
      date: `${point._id.year}-${String(point._id.month).padStart(2, "0")}-${String(point._id.day).padStart(2, "0")}`,
      revenue: round2(point.revenue),
      orders: point.orders,
    })),
    topProducts: topProducts.map((row) => ({ ...row, revenue: round2(row.revenue) })),
    recentOrders,
  });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function resolveRange(input: { now: Date; range: string; from: string | null; to: string | null }) {
  const { now, range, from, to } = input;
  if (range === "custom" && from && to) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    return { rangeStart: fromDate, rangeEnd: toDate };
  }

  if (range === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { rangeStart: start, rangeEnd: now };
  }

  if (range === "30d") {
    const start = new Date(now);
    start.setDate(now.getDate() - 30);
    return { rangeStart: start, rangeEnd: now };
  }

  const start = new Date(now);
  start.setDate(now.getDate() - 7);
  return { rangeStart: start, rangeEnd: now };
}

function resolvePreviousWindow(input: { rangeStart: Date; rangeEnd: Date }) {
  const { rangeStart, rangeEnd } = input;
  const duration = rangeEnd.getTime() - rangeStart.getTime();
  const compareEnd = new Date(rangeStart.getTime() - 1);
  const compareStart = new Date(compareEnd.getTime() - duration);
  return { compareStart, compareEnd };
}

function percentDelta(previous: number, current: number) {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return round2(((current - previous) / previous) * 100);
}

function deriveAnomalies(input: {
  lowStockCount: number;
  pendingOrders: number;
  revenueSeries: number[];
  revenueDeltaPercent: number;
}) {
  const alerts: Array<{ level: "info" | "warning" | "critical"; code: string; message: string }> = [];

  if (input.lowStockCount >= 5) {
    alerts.push({
      level: input.lowStockCount >= 8 ? "critical" : "warning",
      code: "LOW_STOCK",
      message: `${input.lowStockCount} products are below stock threshold.`,
    });
  }
  if (input.pendingOrders >= 20) {
    alerts.push({
      level: input.pendingOrders >= 50 ? "critical" : "warning",
      code: "PENDING_ORDERS",
      message: `${input.pendingOrders} orders are pending/processing.`,
    });
  }
  if (input.revenueDeltaPercent <= -30) {
    alerts.push({
      level: "warning",
      code: "REVENUE_DROP",
      message: `Revenue is down ${Math.abs(input.revenueDeltaPercent)}% vs previous period.`,
    });
  }
  if (input.revenueSeries.length >= 3) {
    const avg = input.revenueSeries.reduce((a, b) => a + b, 0) / input.revenueSeries.length;
    const last = input.revenueSeries[input.revenueSeries.length - 1] ?? 0;
    if (avg > 0 && last >= avg * 1.8) {
      alerts.push({
        level: "info",
        code: "REVENUE_SPIKE",
        message: "Latest revenue point is significantly above period average.",
      });
    }
  }
  return alerts;
}

