import crypto from "crypto";

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || "";
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || "";

function ensureCloudinaryConfig() {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary is not configured");
  }
}

function signParams(params: Record<string, string>) {
  const payload = Object.entries(params)
    .filter(([, value]) => value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return crypto.createHash("sha1").update(`${payload}${CLOUDINARY_API_SECRET}`).digest("hex");
}

export function isCloudinaryUrl(url: string) {
  return /res\.cloudinary\.com\/.+\/image\/upload\//i.test(url);
}

export function getCloudinaryPublicIdFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const marker = "/image/upload/";
    const idx = parsed.pathname.indexOf(marker);
    if (idx === -1) return "";
    let tail = parsed.pathname.slice(idx + marker.length);
    tail = tail.replace(/^v\d+\//, "");
    return tail.replace(/\.[a-zA-Z0-9]+$/, "");
  } catch {
    return "";
  }
}

export async function uploadImageToCloudinary(fileBuffer: Buffer, mimeType: string, folder = "lumenskart/products") {
  ensureCloudinaryConfig();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = signParams({ folder, timestamp });
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(fileBuffer)], { type: mimeType }));
  form.append("api_key", CLOUDINARY_API_KEY);
  form.append("timestamp", timestamp);
  form.append("folder", folder);
  form.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: form,
  });
  const json = (await response.json()) as { secure_url?: string; public_id?: string; error?: { message?: string } };
  if (!response.ok || !json.secure_url) {
    throw new Error(json.error?.message || "Cloudinary upload failed");
  }
  return { secureUrl: json.secure_url, publicId: json.public_id || "" };
}

export async function deleteCloudinaryAssetByPublicId(publicId: string) {
  if (!publicId) return;
  ensureCloudinaryConfig();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = signParams({ public_id: publicId, timestamp });
  const form = new FormData();
  form.append("public_id", publicId);
  form.append("api_key", CLOUDINARY_API_KEY);
  form.append("timestamp", timestamp);
  form.append("signature", signature);

  await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`, {
    method: "POST",
    body: form,
  });
}

export async function deleteCloudinaryAssetByUrl(url: string) {
  if (!isCloudinaryUrl(url)) return;
  const publicId = getCloudinaryPublicIdFromUrl(url);
  if (!publicId) return;
  await deleteCloudinaryAssetByPublicId(publicId);
}
