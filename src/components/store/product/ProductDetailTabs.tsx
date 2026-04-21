"use client";

import { useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/store/types";
import { ProductReviews } from "@/components/store/product/ProductReviews";

type TabKey = "description" | "specification" | "reviews" | "docs";

type DescriptionBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

function normalizeWordPasteText(input: string) {
  let text = input || "";
  const headingTokens = ["Product Introduction", "Features", "Application", "Applications", "Benefits", "Specifications"];

  for (const heading of headingTokens) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const afterRegex = new RegExp(`(${escaped})(?=[A-Z])`, "g");
    text = text.replace(afterRegex, "$1\n");
  }

  const joinedHeadingRegex = /\b([a-z0-9])(?=(Product Introduction|Features|Application|Applications|Benefits|Specifications)\b)/g;
  text = text.replace(joinedHeadingRegex, "$1\n\n");
  text = text.replace(/\.((Features|Application|Applications|Benefits|Specifications)\b)/g, ".\n\n$1");

  return text;
}

function parseDescriptionBlocks(input: string): DescriptionBlock[] {
  const lines = normalizeWordPasteText(input)
    .split(/\r?\n/)
    .map((line) => line.replace(/\t/g, " ").trim())
    .filter((line) => line.length > 0);

  const blocks: DescriptionBlock[] = [];
  let pendingList: string[] = [];

  const flushList = () => {
    if (!pendingList.length) return;
    blocks.push({ type: "list", items: pendingList });
    pendingList = [];
  };

  for (const line of lines) {
    const isBullet = /^([•*-]|\d+\.)\s+/.test(line);
    if (isBullet) {
      pendingList.push(line.replace(/^([•*-]|\d+\.)\s+/, "").trim());
      continue;
    }

    flushList();
    const isHeading = /^[A-Za-z][A-Za-z0-9\s/&()-]{1,80}$/.test(line) && line.split(" ").length <= 6;
    blocks.push({ type: isHeading ? "heading" : "paragraph", text: line });
  }

  flushList();
  return blocks;
}

export function ProductDetailTabs({ product, slug }: { product: Product; slug: string }) {
  const [tab, setTab] = useState<TabKey>("description");
  const specifications = product.specifications.filter((spec) => spec.key && spec.value);
  const technicalDocuments = (product.technicalDocuments ?? []).filter((doc) => doc.name && doc.url);
  const richDescription = (product.richDescription ?? "").trim();
  const hasStructuredRichHtml = /<(p|h2|h3|h4|ul|ol|li|br|div)\b/i.test(richDescription);
  const descriptionBlocks = parseDescriptionBlocks(product.description || "");

  return (
    <section className="border-t border-zinc-200 bg-white">
      <div className="overflow-x-auto border-b border-zinc-200">
        <div className="flex min-w-max items-center gap-3 px-1 pt-1.5 md:min-w-0 md:gap-5">
          {[
            { id: "description", label: "Description" },
            { id: "specification", label: "Specification" },
            { id: "reviews", label: "Reviews" },
            { id: "docs", label: "Technical Documents & Videos" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as TabKey)}
              className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition ${
                tab === item.id ? "border-brand-yellow font-semibold text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-1 py-4 md:py-5">
        {tab === "description" ? (
          <div className="rounded-lg border border-zinc-200 p-4 md:p-5">
            {richDescription && hasStructuredRichHtml ? (
              <article
                className="rich-product-description [&_h2]:mt-5 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-xl [&_h3]:font-semibold [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_p]:text-sm [&_p]:leading-7 [&_p]:text-zinc-700 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1 [&_li]:text-sm [&_li]:leading-7 [&_li]:text-zinc-700"
                dangerouslySetInnerHTML={{ __html: richDescription }}
              />
            ) : richDescription || descriptionBlocks.length ? (
              <div className="space-y-3">
                {parseDescriptionBlocks(richDescription || product.description || "").map((block, index) => {
                  if (block.type === "heading") {
                    return (
                      <h3 key={`desc-heading-${index}`} className="pt-1 text-xl font-semibold text-zinc-800">
                        {block.text}
                      </h3>
                    );
                  }
                  if (block.type === "list") {
                    return (
                      <ul key={`desc-list-${index}`} className="list-disc space-y-1 pl-6 text-sm leading-7 text-zinc-700">
                        {block.items.map((item, itemIndex) => (
                          <li key={`desc-list-item-${index}-${itemIndex}`}>{item}</li>
                        ))}
                      </ul>
                    );
                  }
                  return (
                    <p key={`desc-paragraph-${index}`} className="text-sm leading-7 text-zinc-700">
                      {block.text}
                    </p>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm leading-7 text-zinc-700">No description added yet.</p>
            )}
          </div>
        ) : null}
        {tab === "specification" ? (
          <div className="overflow-hidden rounded-lg border border-zinc-200">
            {specifications.length ? (
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <tbody className="divide-y divide-zinc-200">
                  {specifications.map((spec, index) => (
                    <tr key={`${spec.key}-${index}`} className="even:bg-zinc-50/70">
                      <th className="w-[40%] px-4 py-3 text-left font-medium text-zinc-700">{spec.key}</th>
                      <td className="px-4 py-3 text-zinc-700">{spec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-4 py-6 text-sm text-zinc-500">No specifications available.</p>
            )}
          </div>
        ) : null}
        {tab === "reviews" ? <ProductReviews slug={slug} /> : null}
        {tab === "docs" ? (
          technicalDocuments.length ? (
            <div className="grid gap-2">
              {technicalDocuments.map((doc, index) => (
                <Link
                  key={`${doc.url}-${index}`}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 text-sm hover:border-zinc-300 hover:bg-zinc-50"
                >
                  <span className="font-medium text-zinc-800">{doc.name}</span>
                  <span className="text-zinc-500">Open</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No technical documents or videos available yet.</p>
          )
        ) : null}
      </div>
    </section>
  );
}
