import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SideMenu from "./components/SideMenu";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JobFit",
  description:
    "JobFit - Find the best job matches for your skills and salary expectations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <SideMenu />
        <main className="flex-1 overflow-y-auto p-8 sm:p-10">{children}</main>
      </body>
    </html>
  );
}
