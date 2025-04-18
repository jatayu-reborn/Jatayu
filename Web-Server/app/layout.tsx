import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from 'next/script';
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Admin Map Dashboard",
  description: "Admin login and mapping application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://gallimap.com/static/dist/js/gallimaps.vector.min.latest.js"
          strategy="beforeInteractive"
          id="galli-maps"
        />
      </head>
      <body className={geist.className}>{children}</body>
    </html>
  );
}
