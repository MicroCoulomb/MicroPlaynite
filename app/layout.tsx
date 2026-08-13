import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Micro Playnite",
  description: "Micro Playnite game library",
  icons: {
    icon: "/applogo.png",
    shortcut: "/applogo.png",
    apple: "/applogo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
