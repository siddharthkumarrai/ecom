import { z } from "zod";
import mongoose from "mongoose";
import { json, error } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/requireUser";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User.model";

const AddressSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  line1: z.string().min(1),
  line2: z.string().optional().default(""),
  city: z.string().min(1),
  state: z.string().optional().default(""),
  pincode: z.string().min(4),
  country: z.string().optional().default("India"),
  isDefault: z.boolean().optional().default(false),
});

const CreateSchema = z.object({ address: AddressSchema });
const UpdateSchema = z.object({ addressId: z.string().min(1), address: AddressSchema.partial(), setDefault: z.boolean().optional() });
const RemoveSchema = z.object({ addressId: z.string().min(1) });
const MAX_ADDRESSES = 4;

type ClientAddress = {
  _id: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
};

function toClientAddresses(addresses: unknown): ClientAddress[] {
  if (!Array.isArray(addresses)) return [];
  return addresses.map((item) => {
    const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      _id: String(record._id ?? ""),
      name: typeof record.name === "string" ? record.name : "",
      phone: typeof record.phone === "string" ? record.phone : "",
      line1: typeof record.line1 === "string" ? record.line1 : "",
      line2: typeof record.line2 === "string" ? record.line2 : "",
      city: typeof record.city === "string" ? record.city : "",
      state: typeof record.state === "string" ? record.state : "",
      pincode: typeof record.pincode === "string" ? record.pincode : "",
      country: typeof record.country === "string" && record.country.trim() ? record.country : "India",
      isDefault: Boolean(record.isDefault),
    };
  });
}

export async function GET() {
  const { user } = await requireUser();
  if (!user?._id) return error("Unauthorized", 401);

  await connectDB();
  const dbUser = await User.findById(user._id).select("addresses").lean();
  return json({ addresses: toClientAddresses(dbUser?.addresses) });
}

export async function POST(req: Request) {
  const { user } = await requireUser();
  if (!user?._id) return error("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return error("Invalid payload", 400, parsed.error.flatten());

  await connectDB();

  const address = parsed.data.address;
  const session = await mongoose.startSession();
  let limitReached = false;
  try {
    try {
      await session.withTransaction(async () => {
        if (address.isDefault) {
          await User.updateOne({ _id: user._id }, { $set: { "addresses.$[].isDefault": false } }, { session });
        }
        const pushResult = await User.updateOne(
          { _id: user._id, [`addresses.${MAX_ADDRESSES - 1}`]: { $exists: false } },
          { $push: { addresses: address } },
          { session },
        );
        if (!pushResult.modifiedCount) {
          throw new Error("ADDRESS_LIMIT_REACHED");
        }
      });
    } catch (e) {
      if (e instanceof Error && e.message === "ADDRESS_LIMIT_REACHED") {
        limitReached = true;
      } else {
        throw e;
      }
    }
  } finally {
    session.endSession();
  }

  if (limitReached) {
    return error(`You can save up to ${MAX_ADDRESSES} addresses only.`, 400);
  }

  const updated = await User.findById(user._id).select("addresses").lean();
  return json({ ok: true, addresses: toClientAddresses(updated?.addresses) });
}

export async function PATCH(req: Request) {
  const { user } = await requireUser();
  if (!user?._id) return error("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return error("Invalid payload", 400, parsed.error.flatten());
  if (!mongoose.isValidObjectId(parsed.data.addressId)) return error("Invalid addressId", 400);

  await connectDB();

  const { addressId, address, setDefault } = parsed.data;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      if (setDefault || address.isDefault) {
        await User.updateOne({ _id: user._id }, { $set: { "addresses.$[].isDefault": false } }, { session });
        await User.updateOne({ _id: user._id, "addresses._id": addressId }, { $set: { "addresses.$.isDefault": true } }, { session });
      }

      const sets: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(address)) {
        if (k === "isDefault") continue;
        sets[`addresses.$.${k}`] = v;
      }
      if (Object.keys(sets).length) {
        await User.updateOne({ _id: user._id, "addresses._id": addressId }, { $set: sets }, { session });
      }
    });
  } finally {
    session.endSession();
  }

  const updated = await User.findById(user._id).select("addresses").lean();
  return json({ ok: true, addresses: toClientAddresses(updated?.addresses) });
}

export async function DELETE(req: Request) {
  const { user } = await requireUser();
  if (!user?._id) return error("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = RemoveSchema.safeParse(body);
  if (!parsed.success) return error("Invalid payload", 400, parsed.error.flatten());
  if (!mongoose.isValidObjectId(parsed.data.addressId)) return error("Invalid addressId", 400);

  await connectDB();
  await User.updateOne({ _id: user._id }, { $pull: { addresses: { _id: parsed.data.addressId } } });

  const updated = await User.findById(user._id).select("addresses").lean();
  return json({ ok: true, addresses: toClientAddresses(updated?.addresses) });
}
