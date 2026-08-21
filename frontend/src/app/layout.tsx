import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/shared/ui/header/header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Empora",
  description: "Empora pet project",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <Header />
        <main className="mx-auto w-full max-w-5xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
