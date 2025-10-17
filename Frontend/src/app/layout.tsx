import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Shortner",
    template: "%s | Shortner"
  },
  description: "Production-ready URL shortener with analytics."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-ink-950 antialiased">{children}</body>
    </html>
  );
}
