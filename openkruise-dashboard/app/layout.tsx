import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NamespaceProvider } from "@/components/namespace-provider";
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
  title: "OpenKruise Dashboard",
  description: "Monitor and manage your Kubernetes OpenKruise workloads - CloneSets, Advanced StatefulSets, DaemonSets and more",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NamespaceProvider>{children}</NamespaceProvider>
      </body>
    </html>
  );
}
