import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_TITLE } from "@/lib/seo";

// 不要新增 loading.tsx —— 不論是這裡還是任何 [id] / [name] 路由底下。
//
// loading.tsx 會建立 Suspense 邊界，讓 Next 在頁面解析完成前就把外殼連同
// HTTP 200 送出。等頁面 await 完資料、呼叫 notFound() 時，狀態碼已經送出去
// 改不了了，結果就是所有「路由正確但實體不存在」的網址都回 200 —— 也就是
// soft-404，Google Search Console 會抓，也會浪費爬取預算。
//
// 實測（2026-08-20）：只移除單一路由的 loading.tsx 沒有用，根目錄這個邊界
// 一樣會提早送出外殼；必須根目錄與該路由兩邊都沒有，notFound() 才會回真 404。
//
// 若之後想恢復載入骨架，請改用頁面「內部」的 <Suspense>，包在資料
// await 之後的子區塊，不要包住整個頁面。

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
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
            __html: `(function(){try{var t;try{var a=localStorage.getItem('public-reader:appearance');if(a){var p=JSON.parse(a);if(p&&typeof p==='object'&&!Array.isArray(p)){var v=p.theme;if(v==='dark'||v==='light'||v==='system')t=v}}}catch(e){}var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
