import type { Metadata, Viewport } from "next";
import "@/styles/tokens.css";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Herra",
  description:
    "Crop suitability and field health for smallholder farmers and cooperative administrators.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Figtree:wght@300..900&family=JetBrains+Mono:wght@400..600&family=Urbanist:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
