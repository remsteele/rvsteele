import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Remington Steele Portfolio",
  description: "Terminal-style portfolio for Remington Steele"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
