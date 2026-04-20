import { auth, currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User.model";

export async function requireUser() {
  const { userId } = await auth();
  if (!userId) return { user: null, clerkUserId: null };

  await connectDB();
  const dbUser = await User.findOne({ clerkId: userId }).select("_id role clerkId email name").lean();
  if (dbUser && dbUser.name) return { user: dbUser, clerkUserId: userId };

  // Ensure name/email exist immediately after signup/login even if webhook is delayed.
  const clerkUser = await currentUser();
  if (!clerkUser) return { user: dbUser, clerkUserId: userId };
  const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? dbUser?.email ?? "";
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() ||
    clerkUser.username ||
    dbUser?.name ||
    "Customer";

  const user = await User.findOneAndUpdate(
    { clerkId: userId },
    { $set: { email, name }, $setOnInsert: { role: "customer", clerkId: userId } },
    { upsert: true, returnDocument: "after" }
  )
    .select("_id role clerkId email name")
    .lean();

  return { user, clerkUserId: userId };
}
