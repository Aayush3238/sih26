import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Attack Forecaster | SIH26153",
  description: "AI-Based Network Attack Forecasting Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#0a0a0f] text-white">{children}</body>
    </html>
  );
}
