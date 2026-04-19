import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "div",
  "h2",
  "h3",
  "h4",
  "p",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "u",
  "blockquote",
  "a",
  "br",
  "span",
];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "target", "rel"],
  span: ["style"],
};

const ALLOWED_SCHEMES = ["http", "https", "mailto", "tel"];

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

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

function plainTextToHtml(input: string) {
  const lines = normalizeWordPasteText(input)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (!lines.length) return "";

  const chunks: string[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (!listItems.length) return;
    chunks.push(`<ul>${listItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`);
    listItems = [];
  };

  for (const line of lines) {
    const bulletMatch = line.match(/^([•*-]|\d+\.)\s+(.+)$/);
    if (bulletMatch) {
      listItems.push(bulletMatch[2].trim());
      continue;
    }

    flushList();
    chunks.push(`<p>${escapeHtml(line)}</p>`);
  }

  flushList();
  return chunks.join("");
}

function normalizeLooseBlocks(html: string) {
  if (!html) return "";

  let output = html;

  // If users paste content that becomes loose text after headings, wrap it in paragraphs.
  output = output.replace(
    /(<\/h[2-4]>)(\s*)([^<][\s\S]*?)(?=(<h[2-4]\b|<ul\b|<ol\b|<p\b|$))/gi,
    (_match, headingClose, _gap, looseText) => {
      const text = String(looseText ?? "").trim();
      if (!text) return headingClose;
      return `${headingClose}<p>${text}</p>`;
    }
  );

  // If the document starts with raw text, wrap it too.
  output = output.replace(/^([^<][\s\S]*?)(?=<h[2-4]\b|<p\b|<ul\b|<ol\b|$)/i, (match) => {
    const text = match.trim();
    if (!text) return "";
    return `<p>${text}</p>`;
  });

  return output;
}

export function sanitizeRichHtml(input: string) {
  const raw = input || "";
  const hasHtmlTags = /<\s*\/?\s*[a-z][^>]*>/i.test(raw);
  const normalizedInput = hasHtmlTags ? raw : plainTextToHtml(raw);

  const sanitized = sanitizeHtml(normalizedInput, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ALLOWED_SCHEMES,
    allowedStyles: {
      span: {
        color: [/^#[0-9a-fA-F]{3,8}$/, /^rgb\((\s*\d+\s*,){2}\s*\d+\s*\)$/],
      },
    },
    transformTags: {
      div: "p",
      b: "strong",
      i: "em",
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
    },
    exclusiveFilter(frame) {
      if ((frame.tag === "p" || frame.tag === "span") && !frame.text.trim()) return true;
      return false;
    },
  }).trim();

  return normalizeLooseBlocks(sanitized);
}
