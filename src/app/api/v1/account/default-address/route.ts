import { json, error } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/requireUser";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User.model";

export async function GET() {
  const { user } = await requireUser();
  if (!user?._id) return error("Unauthorized", 401);

  await connectDB();
  const dbUser = await User.findById(user._id).select("addresses").lean();
  const address = dbUser?.addresses?.find((item) => item.isDefault) ?? dbUser?.addresses?.[0] ?? null;
  return json({ address });
}
