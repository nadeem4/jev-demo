import type { Metadata } from "next";
import { Overpass, Overpass_Mono } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

// Overpass is an open-source take on Highway Gothic, the lettering on US road signs.
const overpass = Overpass({ variable: "--font-overpass", subsets: ["latin"], weight: ["400", "600", "800"] });
// Its monospace sibling, for the data the models exchange.
const overpassMono = Overpass_Mono({ variable: "--font-overpass-mono", subsets: ["latin"], weight: ["400", "600"] });

const DESCRIPTION =
  "Jev and Laya play the same games on the same scenarios with zero training, with every input and decision visible, plus benchmarks and how the models work.";

export const metadata: Metadata = {
  metadataBase: new URL("https://arena.codewithnk.com"),
  title: "Decision Arena",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Decision Arena",
    url: "https://arena.codewithnk.com",
    title: "Decision Arena",
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: "Decision Arena", description: DESCRIPTION },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${overpass.variable} ${overpassMono.variable} antialiased`}>
      <body className="min-h-[100dvh]">
        <SiteNav />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
