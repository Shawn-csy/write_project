import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://open-scripts.shawnup.com";

export const metadata: Metadata = {
  title: "關於｜Screenplay Reader",
  description: "Screenplay Reader 是免費的台本線上閱讀平台，讓創作者輕鬆發布與分享劇本作品。",
  alternates: { canonical: `${BASE_URL}/about` },
  openGraph: {
    title: "關於｜Screenplay Reader",
    description: "Screenplay Reader 是免費的台本線上閱讀平台，讓創作者輕鬆發布與分享劇本作品。",
    url: `${BASE_URL}/about`,
    siteName: "Screenplay Reader",
    locale: "zh_TW",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="flex flex-col items-center text-center mb-12">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4 border border-primary/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-serif font-bold">關於 Screenplay Reader</h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-xl">
            免費的台本線上閱讀與發布平台，讓每位創作者的作品都能被看見。
          </p>
        </div>

        <div className="space-y-6">
          {/* Vision */}
          <div className="rounded-xl border border-border/60 bg-muted/10 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-primary">♥</span> 創作理念
            </h2>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              <p>
                Screenplay Reader 由台灣獨立開發者打造，旨在為台本、劇本、小說創作者提供一個免費、開放的展覽與閱讀空間。
              </p>
              <ul className="list-disc pl-5 space-y-2 text-foreground/90">
                <li><strong>公開閱讀</strong>：所有公開台本皆可免費瀏覽，不需登入。</li>
                <li><strong>創作者頁面</strong>：每位作者都有專屬的公開展示頁面。</li>
                <li><strong>創作工作室</strong>：登入後可使用完整的台本編輯與管理功能。</li>
                <li><strong>專業編輯器</strong>：支援分場、角色標記、封面設計、匯出等功能。</li>
              </ul>
            </div>
          </div>

          {/* Changelog */}
          <div className="rounded-xl border border-border/60 bg-muted/10 p-6">
            <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
              <span className="text-primary">↻</span> 近期更新
            </h2>
            <p className="text-sm text-muted-foreground mb-4">持續開發中，歡迎回報問題或建議。</p>
            <ul className="space-y-3 text-sm">
              <li className="rounded-lg border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">2026 年 6 月</div>
                <div className="mt-1 font-medium text-foreground">SEO 架構升級</div>
                <div className="mt-1 text-muted-foreground">
                  遷移至 Next.js SSR，台本頁面現可被 Google 與 AI 搜尋引擎完整索引。
                </div>
              </li>
              <li className="rounded-lg border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">2026 年 5 月</div>
                <div className="mt-1 font-medium text-foreground">封面設計器</div>
                <div className="mt-1 text-muted-foreground">
                  全新封面設計工具，支援 Figma 風格縮放、背景與文字排版。
                </div>
              </li>
              <li className="rounded-lg border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">2026 年 4 月</div>
                <div className="mt-1 font-medium text-foreground">匯出功能</div>
                <div className="mt-1 text-muted-foreground">
                  支援匯出至 PDF、Google Docs，以及自訂 metadata 選擇。
                </div>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="rounded-xl border border-border/60 bg-muted/10 p-6">
            <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
              <span className="text-primary">✉</span> 聯絡我們
            </h2>
            <p className="text-sm text-muted-foreground mb-4">有任何問題、建議或回報，歡迎聯繫。</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="mailto:silence0603@gmail.com"
                className="flex-1 flex items-center gap-3 p-4 rounded-xl border bg-background hover:bg-muted/50 transition-colors"
              >
                <div className="bg-primary/10 p-2.5 rounded-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                  >
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-sm">Email</div>
                  <div className="text-sm text-muted-foreground">silence0603@gmail.com</div>
                </div>
              </a>
              <a
                href="https://discordapp.com/users/booostman1"
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center gap-3 p-4 rounded-xl border bg-background hover:bg-muted/50 transition-colors"
              >
                <div className="bg-[#5865F2]/10 p-2.5 rounded-lg">
                  <svg className="w-5 h-5 text-[#5865F2] fill-current" viewBox="0 0 127.14 96.36">
                    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.11,77.11,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.89,105.89,0,0,0,126.6,80.22c1.24-23.28-3.28-47.54-18.9-72.15ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-sm">Discord</div>
                  <div className="text-sm text-muted-foreground">booostman1</div>
                </div>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground underline">
            ← 返回台本列表
          </a>
        </div>
      </div>
    </div>
  );
}
