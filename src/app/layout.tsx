import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/ToastProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "UniTrack CMS | Choice-Based Credit System",
  description:
    "Choice-Based Credit System & Prerequisite-Aware Course Management System for BCA Software Engineering.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#F4F7FB] text-[#111111] font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
