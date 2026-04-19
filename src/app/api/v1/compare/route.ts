import { z } from "zod";
import { error, json } from "@/lib/api/response";
import { getProductsByIdsOrMock } from "@/lib/store/data";

const QuerySchema = z.object({
  ids: z.string().optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    ids: url.searchParams.get("ids") ?? undefined,
  });
  if (!parsed.success) return error("Invalid query", 400, parsed.error.flatten());

  const ids = (parsed.data.ids ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 12);

  if (!ids.length) return json({ items: [] });

  const { products } = await getProductsByIdsOrMock(ids);
  return json({ items: products });
}
