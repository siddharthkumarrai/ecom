import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";

interface FooterProps {
  columns: Array<{ title: string; links: Array<{ label: string; href: string }> }>;
  phones: string[];
  address: string;
  socialLinks?: Array<{ platform: string; url: string; logoUrl?: string }>;
  newsletterText: string;
  newsletterPlaceholder: string;
  newsletterButtonText: string;
  navbarBg: string;
  footerBg: string;
  footerTopBg: string;
  footerText: string;
  footerMutedText: string;
  uiButtonBg: string;
  uiButtonHoverBg: string;
  storeName: string;
  logoUrl?: string;
}

export function Footer({
  columns,
  phones,
  address,
  socialLinks = [],
  newsletterText,
  newsletterPlaceholder,
  newsletterButtonText,
  navbarBg,
  footerBg,
  footerTopBg,
  footerText,
  footerMutedText,
  uiButtonBg,
  uiButtonHoverBg,
  storeName,
  logoUrl,
}: FooterProps) {
  const resolvedStoreName = String(storeName || "").trim() || "lumenskart";
  const resolvedLogoUrl = String(logoUrl || "").trim();
  const hasLogo = Boolean(resolvedLogoUrl);
  const safeColumns = columns.length
    ? columns
    : [
        {
          title: "Find it Fast",
          links: [
            { label: "Metal Oxide Varistor", href: "/category/metal-oxide-varistor" },
            { label: "Capacitors", href: "/category/capacitors" },
            { label: "DIODE", href: "/category/diode" },
            { label: "Connector", href: "/category/connector" },
          ],
        },
        {
          title: "Customer Care",
          links: [
            { label: "About", href: "/about" },
            { label: "Contact", href: "/contact" },
            { label: "Privacy Policy", href: "/privacy-policy" },
            { label: "Terms & Conditions", href: "/terms-and-conditions" },
          ],
        },
      ];
  const findItFastColumn = safeColumns[0];
  const customerCareColumn = safeColumns[1];
  const findItFastLinks = Array.isArray(findItFastColumn?.links) ? findItFastColumn.links : [];
  const splitAt = Math.ceil(findItFastLinks.length / 2);
  const findLeftLinks = findItFastLinks.slice(0, splitAt);
  const findRightLinks = findItFastLinks.slice(splitAt);

  const normalizedSocialLinks = socialLinks
    .map((item) => ({
      platform: String(item?.platform || "").trim(),
      url: String(item?.url || "").trim(),
      logoUrl: String(item?.logoUrl || "").trim(),
    }))
    .filter((item) => item.platform || item.logoUrl);
  const resolvedFooterBg = String(footerBg || "").trim() || "#f6f6f6";
  const resolvedFooterTopBg = String(footerTopBg || "").trim() || String(navbarBg || "").trim() || "#f5c400";
  const resolvedFooterText = String(footerText || "").trim() || "#27272a";
  const resolvedFooterMutedText = String(footerMutedText || "").trim() || "#71717a";
  const resolvedUiButtonBg = String(uiButtonBg || "").trim() || "#f5c400";
  const resolvedUiButtonHoverBg = String(uiButtonHoverBg || "").trim() || "#ffd84d";
  const footerVars = {
    "--footer-bg": resolvedFooterBg,
    "--footer-top-bg": resolvedFooterTopBg,
    "--footer-text": resolvedFooterText,
    "--footer-muted-text": resolvedFooterMutedText,
    "--footer-btn-bg": resolvedUiButtonBg,
    "--footer-btn-hover-bg": resolvedUiButtonHoverBg,
  } as CSSProperties;

  const renderSocialIcon = (platform: string) => {
    const normalized = platform.toLowerCase();
    if (normalized.includes("facebook")) return "f";
    if (normalized.includes("instagram")) return "ig";
    if (normalized.includes("linkedin")) return "in";
    if (normalized.includes("mail")) return "@";
    return "www";
  };

  return (
    <footer className="mt-8 border-t border-zinc-200 bg-[var(--footer-bg)] text-[color:var(--footer-text)]" style={footerVars}>
      <div className="border-b border-zinc-200 bg-[var(--footer-top-bg)] py-2.5">
        <div className="flex w-full flex-col gap-3 px-[var(--content-px-mobile)] md:flex-row md:items-center md:justify-between md:px-[var(--content-px-desktop)]">
          <div className="flex items-center gap-3 text-[color:var(--footer-text)]">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/70">
              <span className="text-sm">✉</span>
            </span>
            <p className="text-sm font-semibold">{newsletterText}</p>
          </div>
          <div className="flex w-full items-center md:w-auto">
            <input
              className="h-10 w-full rounded-l-full border border-zinc-300 bg-white px-4 text-sm md:w-72"
              placeholder={newsletterPlaceholder}
            />
            <button className="h-10 rounded-r-full bg-[var(--footer-btn-bg)] px-6 text-sm font-semibold text-zinc-900 transition-colors hover:bg-[var(--footer-btn-hover-bg)]">
              {newsletterButtonText}
            </button>
          </div>
        </div>
      </div>

      <div className="grid w-full gap-8 px-[var(--content-px-mobile)] py-8 md:grid-cols-[1.1fr_1.2fr_0.9fr] md:px-[var(--content-px-desktop)]">
        <div>
          {hasLogo ? (
            <Image
              src={resolvedLogoUrl}
              alt={resolvedStoreName}
              width={220}
              height={48}
              className="h-12 w-auto max-w-[220px] object-contain"
            />
          ) : (
            <h3 className="text-5xl font-bold italic lowercase tracking-tight text-[color:var(--footer-text)]">{resolvedStoreName}</h3>
          )}
          <p className="mt-4 text-sm text-[color:var(--footer-muted-text)]">Got questions? Call us 24/7!</p>
          {(phones.length ? phones : ["+91 77100 12135"]).map((phone) => (
            <p key={phone} className="text-[30px] leading-tight text-[color:var(--footer-text)]">
              {phone}
            </p>
          ))}
          <p className="mt-4 text-sm font-semibold text-[color:var(--footer-text)]">Contact info</p>
          <p className="mt-1 text-xs text-[color:var(--footer-muted-text)]">{address || "809/810, 8th Floor, Tower-B, Lodha Supremus, Kolshet Road, Thane West - 400607."}</p>
          <div className="mt-4 flex items-center gap-2">
            {(normalizedSocialLinks.length
              ? normalizedSocialLinks
              : [
                  { platform: "facebook", url: "#", logoUrl: "" },
                  { platform: "instagram", url: "#", logoUrl: "" },
                  { platform: "linkedin", url: "#", logoUrl: "" },
                ]).map((item) => (
              <a
                key={`${item.platform}-${item.url}`}
                href={item.url || "#"}
                target={item.url.startsWith("http") ? "_blank" : undefined}
                rel={item.url.startsWith("http") ? "noreferrer" : undefined}
                aria-label={item.platform || "social link"}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 text-[color:var(--footer-muted-text)] transition hover:border-zinc-500 hover:text-[color:var(--footer-text)]"
              >
                {item.logoUrl ? (
                  <Image
                    src={item.logoUrl}
                    alt={item.platform || "social"}
                    width={16}
                    height={16}
                    className="h-4 w-4 object-contain"
                  />
                ) : (
                  <span className="text-[10px] font-semibold uppercase">{renderSocialIcon(item.platform)}</span>
                )}
              </a>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-2xl font-semibold text-[color:var(--footer-text)]">{findItFastColumn?.title || "Find it Fast"}</h4>
          <div className="mt-3 grid grid-cols-2 gap-x-5">
            {[findLeftLinks, findRightLinks].map((linkGroup, index) => (
              <ul key={`find-links-${index}`} className="space-y-2 text-sm">
                {linkGroup.map((link, linkIndex) => (
                  <li key={`${findItFastColumn?.title || "find"}-${link.label}-${link.href}-${index}-${linkIndex}`}>
                    <Link href={link.href} className="text-[color:var(--footer-muted-text)] hover:text-[color:var(--footer-text)]">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-2xl font-semibold text-[color:var(--footer-text)]">{customerCareColumn?.title || "Customer Care"}</h4>
          <ul className="mt-3 space-y-2 text-sm">
            {(customerCareColumn?.links ?? []).map((link, linkIndex) => (
              <li key={`${customerCareColumn?.title || "care"}-${link.label}-${link.href}-${linkIndex}`}>
                <Link href={link.href} className="text-[color:var(--footer-muted-text)] hover:text-[color:var(--footer-text)]">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-zinc-200 px-[var(--content-px-mobile)] py-3 text-xs text-[color:var(--footer-muted-text)] md:flex-row md:items-center md:justify-between md:px-[var(--content-px-desktop)]">
        <p>© {resolvedStoreName} - All rights Reserved</p>
        <div className="flex items-center gap-2 text-[11px] font-medium text-[color:var(--footer-muted-text)]">
          {["VISA", "Mastercard", "PayPal", "Stripe"].map((item) => (
            <span key={item} className="rounded border border-zinc-300 bg-white px-2 py-1">
              {item}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
