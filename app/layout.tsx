import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KapeGuid — Coffee Customer Tracker",
  description: "QR-based customer management for your café",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
