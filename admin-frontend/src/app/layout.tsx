import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Manrope } from "next/font/google";
import { AuthProvider } from "@/lib/auth/auth-context";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"], display: "swap" });
const inter = Inter({ variable: "--font-inter-face", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Admin console", template: "%s | Global Aviation Admin" },
  description: "Administration console for the Global Aviation Services Directory.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0b1f3a" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${manrope.variable} ${jetbrainsMono.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
