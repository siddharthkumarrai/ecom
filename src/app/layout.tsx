import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { buildCanonical, buildOgImage, getMetadataBase, getSiteSeoSettings } from "@/lib/seo";
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
  const seo = await getSiteSeoSettings();
  const defaultTitle = seo.defaultTitle || seo.siteName;
  const favicon = buildCanonical(seo.favicon);
  const socialImage = buildOgImage(seo.logoUrl || seo.ogImage || seo.defaultOgImage);

  return {
    metadataBase: getMetadataBase(),
    title: defaultTitle,
    description: seo.defaultDescription,
    alternates: {
      canonical: buildCanonical("/"),
    },
    robots: {
      index: true,
      follow: true,
    },
    verification: seo.googleVerification
      ? {
          google: seo.googleVerification,
        }
      : undefined,
    icons: {
      icon: [{ url: favicon }],
      apple: [{ url: favicon, sizes: "180x180" }],
    },
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: seo.siteName,
      url: buildCanonical("/"),
      title: defaultTitle,
      description: seo.defaultDescription,
      images: [
        {
          url: socialImage,
          alt: `${seo.siteName} logo`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: defaultTitle,
      description: seo.defaultDescription,
      images: [socialImage],
    },
  };
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
        <head>
          <link rel="preconnect" href="https://lumenskart.in" crossOrigin="" />
          <link rel="dns-prefetch" href="https://lumenskart.in" />
        </head>
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
