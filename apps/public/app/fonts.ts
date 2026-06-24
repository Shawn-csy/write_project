import { Noto_Sans_TC, Noto_Serif_TC } from "next/font/google";

export const publicSans = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-public-sans",
  display: "swap",
  preload: false,
});

export const publicSerif = Noto_Serif_TC({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-public-serif",
  display: "swap",
  preload: false,
});
