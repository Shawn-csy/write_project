import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "免費台本 · 劇本線上閱讀｜Screenplay Reader",
  description: "免費瀏覽、閱讀與分享創作台本。支援 Fountain 格式劇本，探索公開作品、配音台本與作者頁面。",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL?.startsWith("http")
      ? process.env.NEXT_PUBLIC_BASE_URL
      : "https://open-scripts.shawnup.com"
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" className="h-full antialiased">
      <head>
        {/* Blocking script: apply dark class before first paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('screenplay-reader-theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
