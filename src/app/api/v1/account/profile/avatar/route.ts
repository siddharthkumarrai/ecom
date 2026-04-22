import { error, json } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/requireUser";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User.model";
import { deleteCloudinaryAssetByUrl, uploadImageToCloudinary } from "@/lib/media/cloudinary";

export async function POST(req: Request) {
  const { user } = await requireUser();
  if (!user?._id) return error("Unauthorized", 401);

  const formData = await req.formData().catch(() => null);
  if (!formData) return error("Invalid form data", 400);

  const file = formData.get("file");
  if (!(file instanceof File)) return error("File is required", 400);
  if (!file.type.startsWith("image/")) return error("Only image files are allowed", 400);

  const maxBytes = 8 * 1024 * 1024;
  if (file.size > maxBytes) return error("Image must be less than 8MB", 400);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadImageToCloudinary(buffer, file.type, "lumenskart/profiles");
    await connectDB();
    const existing = await User.findById(user._id).select("profileImageUrl").lean<{ profileImageUrl?: string } | null>();
    await User.updateOne({ _id: user._id }, { $set: { profileImageUrl: uploaded.secureUrl } });
    if (existing?.profileImageUrl && existing.profileImageUrl !== uploaded.secureUrl) {
      await deleteCloudinaryAssetByUrl(existing.profileImageUrl).catch(() => undefined);
    }
    return json({ imageUrl: uploaded.secureUrl, publicId: uploaded.publicId });
  } catch (e) {
    return error("Image upload failed", 500, String(e));
  }
}

