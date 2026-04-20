import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { connectDB } from "@/lib/db/mongoose";
import { SiteConfig } from "@/lib/db/models/SiteConfig.model";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    await connectDB();
    const config = await SiteConfig.findOne({ key: "main" })
      .select("seo.siteName seo.defaultDescription seo.favicon branding.storeName")
      .lean<{
        seo?: { siteName?: string; defaultDescription?: string; favicon?: string };
        branding?: { storeName?: string };
      } | null>();

    const title =
      String(config?.seo?.siteName || "").trim() ||
      String(config?.branding?.storeName || "").trim() ||
      "Lumenskart";
    const description =
      String(config?.seo?.defaultDescription || "").trim() ||
      "Next-level electronics e-commerce storefront";
    const favicon = String(config?.seo?.favicon || "").trim() || "/favicon.ico";

    return {
      title,
      description,
      icons: { icon: favicon },
    };
  } catch {
    return {
      title: "Lumenskart",
      description: "Next-level electronics e-commerce storefront",
      icons: { icon: "/favicon.ico" },
    };
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
