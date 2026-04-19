import { headers } from "next/headers";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { Webhook } from "svix";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User.model";

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) return new Response("Missing CLERK_WEBHOOK_SECRET", { status: 500 });

  const h = await headers();
  const svix_id = h.get("svix-id");
  const svix_timestamp = h.get("svix-timestamp");
  const svix_signature = h.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  let evt: WebhookEvent;
  try {
    const wh = new Webhook(secret);
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  await connectDB();

  if (evt.type === "user.created" || evt.type === "user.updated") {
    const email = evt.data.email_addresses?.[0]?.email_address ?? "";
    const name = `${evt.data.first_name ?? ""} ${evt.data.last_name ?? ""}`.trim() || evt.data.username || "Customer";
    await User.findOneAndUpdate(
      { clerkId: evt.data.id },
      { $set: { email, name }, $setOnInsert: { role: "customer", clerkId: evt.data.id } },
      { upsert: true }
    );
  }

  return new Response("OK", { status: 200 });
}

