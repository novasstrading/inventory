import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { withBasePath } from "@/lib/base-path";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nova SS — Asset Manager",
  description: "Nova SS Trading internal asset management system",
  icons: { icon: withBasePath("/logo-icon.png"), apple: withBasePath("/logo-icon.png") },
};

export const viewport = {
  themeColor: "#001E46",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg text-ink text-sm">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
