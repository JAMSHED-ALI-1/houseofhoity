import { Geist, Geist_Mono } from "next/font/google";
import BackNavigationRefresh from "@/components/common/BackNavigationRefresh";
import { AppProvider } from "@/store/provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Hoity Moppet - Fashion",
  description: "Fashion ecommerce homepage inspired by the Gecko Shopify demo.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppProvider>
          <BackNavigationRefresh />
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
