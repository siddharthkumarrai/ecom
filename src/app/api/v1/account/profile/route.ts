import { z } from "zod";
import mongoose from "mongoose";
import { json, error } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/requireUser";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User.model";
import { deleteCloudinaryAssetByUrl } from "@/lib/media/cloudinary";

const UpdateProfileSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).optional().default(""),
  salesCode: z.string().trim().max(80).optional().default(""),
  profileImageUrl: z.union([z.string().trim().url(), z.literal("")]).optional(),
});

export async function PATCH(req: Request) {
  const { user } = await requireUser();
  if (!user?._id) return error("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) return error("Invalid payload", 400, parsed.error.flatten());

  await connectDB();

  const userObjectId = typeof user._id === "string" ? new mongoose.Types.ObjectId(user._id) : user._id;
  const existing = await User.collection.findOne(
    { _id: userObjectId },
    { projection: { profileImageUrl: 1 } }
  ) as { profileImageUrl?: string } | null;
  const nextProfileImageUrl = parsed.data.profileImageUrl ?? existing?.profileImageUrl ?? "";
  await User.collection.updateOne(
    { _id: userObjectId },
    {
      $set: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        salesCode: parsed.data.salesCode,
        profileImageUrl: nextProfileImageUrl,
      },
    }
  );
  const updated = await User.collection.findOne(
    { _id: userObjectId },
    { projection: { name: 1, phone: 1, salesCode: 1, email: 1, profileImageUrl: 1 } }
  ) as {
    name?: string;
    phone?: string;
    salesCode?: string;
    email?: string;
    profileImageUrl?: string;
  } | null;

  if (!updated) return error("User not found", 404);
  if (
    existing?.profileImageUrl &&
    existing.profileImageUrl !== nextProfileImageUrl
  ) {
    await deleteCloudinaryAssetByUrl(existing.profileImageUrl).catch(() => undefined);
  }

  return json({
    ok: true,
    user: {
      name: updated.name ?? "",
      phone: updated.phone ?? "",
      salesCode: updated.salesCode ?? "",
      email: updated.email ?? "",
      profileImageUrl: updated.profileImageUrl ?? "",
    },
  });
}

