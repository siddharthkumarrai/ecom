import { error, json } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { uploadImageToCloudinary } from "@/lib/media/cloudinary";

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return error(admin.reason === "unauthorized" ? "Unauthorized" : "Not found", admin.reason === "unauthorized" ? 401 : 404);

  const formData = await req.formData().catch(() => null);
  if (!formData) return error("Invalid form data", 400);
  const file = formData.get("file");
  if (!(file instanceof File)) return error("File is required", 400);
  if (!file.type.startsWith("image/")) return error("Only image files are allowed", 400);

  const maxBytes = 8 * 1024 * 1024;
  if (file.size > maxBytes) return error("Image must be less than 8MB", 400);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadImageToCloudinary(buffer, file.type);
    return json({ imageUrl: uploaded.secureUrl, publicId: uploaded.publicId });
  } catch (e) {
    return error("Image upload failed", 500, String(e));
  }
}
