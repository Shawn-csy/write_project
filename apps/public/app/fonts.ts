import { Noto_Sans_TC } from "next/font/google";

export const publicSans = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-public-sans",
  display: "swap",
  preload: false,
});
