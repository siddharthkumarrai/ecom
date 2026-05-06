import { auth, currentUser } from "@clerk/nextjs/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User.model";

type AuthenticatedUser = {
  _id: mongoose.Types.ObjectId;
  role: string;
  clerkId: string;
  email: string;
  name: string;
  profileImageUrl: string;
};

function toObjectId(value: unknown): mongoose.Types.ObjectId | null {
  if (value instanceof mongoose.Types.ObjectId) return value;
  const normalized = typeof value === "string" ? value.trim() : String(value ?? "").trim();
  if (!normalized || !mongoose.isValidObjectId(normalized)) return null;
  return new mongoose.Types.ObjectId(normalized);
}

function toAuthenticatedUser(value: {
  _id: unknown;
  role?: string;
  clerkId?: string;
  email?: string;
  name?: string;
  profileImageUrl?: string;
} | null): AuthenticatedUser | null {
  if (!value) return null;
  const objectId = toObjectId(value._id);
  if (!objectId) return null;
  return {
    _id: objectId,
    role: typeof value.role === "string" ? value.role : "customer",
    clerkId: typeof value.clerkId === "string" ? value.clerkId : "",
    email: typeof value.email === "string" ? value.email : "",
    name: typeof value.name === "string" ? value.name : "",
    profileImageUrl: typeof value.profileImageUrl === "string" ? value.profileImageUrl : "",
  };
}

function normalizeImageUrl(value: unknown) {
  const url = typeof value === "string" ? value.trim() : "";
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (/^data:image\//i.test(url)) return url;
  if (url.startsWith("/")) return url;
  return "";
}

export async function requireUser(): Promise<{ user: AuthenticatedUser | null; clerkUserId: string | null }> {
  const { userId } = await auth();
  if (!userId) return { user: null, clerkUserId: null };

  await connectDB();
  const dbUserBase = await User.findOne({ clerkId: userId })
    .select("_id role clerkId email name profileImageUrl")
    .lean<{
      _id: unknown;
      role?: string;
      clerkId?: string;
      email?: string;
      name?: string;
      profileImageUrl?: string;
    } | null>();
  const rawProfileDoc = await User.collection.findOne(
    { clerkId: userId },
    { projection: { profileImageUrl: 1 } }
  ) as { profileImageUrl?: string } | null;
  const dbProfileImageUrl = normalizeImageUrl(rawProfileDoc?.profileImageUrl ?? dbUserBase?.profileImageUrl ?? "");
  const dbUser = toAuthenticatedUser(
    dbUserBase
      ? {
          ...dbUserBase,
          profileImageUrl: dbProfileImageUrl,
        }
      : null
  );
  if (dbUser && dbUser.name && dbUser.profileImageUrl) return { user: dbUser, clerkUserId: userId };

  // Ensure name/email exist immediately after signup/login even if webhook is delayed.
  const clerkUser = await currentUser();
  if (!clerkUser) return { user: dbUser, clerkUserId: userId };
  const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? dbUser?.email ?? "";
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() ||
    clerkUser.username ||
    dbUser?.name ||
    "Customer";
  const profileImageUrl = normalizeImageUrl(dbUser?.profileImageUrl) || normalizeImageUrl(clerkUser.imageUrl);

  const user = await User.findOneAndUpdate(
    { clerkId: userId },
    { $set: { email, name, profileImageUrl }, $setOnInsert: { role: "customer", clerkId: userId } },
    { upsert: true, returnDocument: "after" }
  )
    .select("_id role clerkId email name profileImageUrl")
    .lean<{
      _id: unknown;
      role?: string;
      clerkId?: string;
      email?: string;
      name?: string;
      profileImageUrl?: string;
    } | null>();

  const latestRawProfileDoc = await User.collection.findOne(
    { clerkId: userId },
    { projection: { profileImageUrl: 1 } }
  ) as { profileImageUrl?: string } | null;

  const normalizedUser = toAuthenticatedUser(
    user
      ? {
          ...user,
          profileImageUrl:
            typeof latestRawProfileDoc?.profileImageUrl === "string"
              ? normalizeImageUrl(latestRawProfileDoc.profileImageUrl)
              : normalizeImageUrl(user.profileImageUrl ?? ""),
        }
      : null
  );

  return { user: normalizedUser, clerkUserId: userId };
}
