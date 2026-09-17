import type { Metadata } from "next";
import "./globals.css";

const title = "Dead Air · Your Coast, Your Cut";
const description =
  "Run an original coastal pirate-TV broadcast. Name your station, freeze a camera frame, edit it in Unlayer React Image Editor, and decide what goes on air. No account, no sign-up.";
const siteUrl = "https://dead-air-coast.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: "Dead Air",
  authors: [{ name: "Dead Air" }],
  keywords: [
    "Dead Air",
    "pirate TV",
    "image editor",
    "Unlayer React Image Editor",
    "interactive story",
    "broadcast game",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Dead Air",
    title,
    description,
    locale: "en_US",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "DEAD AIR · YOUR COAST. YOUR CUT. — a pirate-TV broadcast van looking out on a waterfront auction",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "DEAD AIR · YOUR COAST. YOUR CUT. — a pirate-TV broadcast van looking out on a waterfront auction",
      },
    ],
  },
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport = {
  themeColor: "#0b1319",
  colorScheme: "dark" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
