import type { Metadata } from "next";
import Link from "next/link";
import { PublicTopBar } from "@/components/PublicTopBar";
import { PublicShellActions } from "@/components/PublicShellActions";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://open-scripts.shawnup.com";

export const metadata: Metadata = {
  title: "使用說明｜泛用型產品作坊",
  description: "泛用型產品作坊台本平台使用說明：如何閱讀台本、發布作品、使用編輯器功能。",
  alternates: { canonical: `${BASE_URL}/help` },
  openGraph: {
    title: "使用說明｜泛用型產品作坊",
    description: "泛用型產品作坊台本平台使用說明：如何閱讀台本、發布作品、使用編輯器功能。",
    url: `${BASE_URL}/help`,
    siteName: "泛用型產品作坊",
    locale: "zh_TW",
  },
};

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicTopBar showBack backHref="/" backLabel="返回" trailing={<PublicShellActions />} />
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-serif font-bold mb-2">使用說明</h1>
        <p className="text-sm text-muted-foreground mb-10">泛用型產品作坊平台操作指南</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">閱讀台本</h2>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>所有公開台本可在首頁直接瀏覽，無需登入。</p>
              <ul className="list-disc pl-5 space-y-1 text-foreground/90">
                <li>點擊台本封面或標題進入閱讀頁</li>
                <li>閱讀頁右上角可調整字體大小、行距、主題色</li>
                <li>支援目錄導覽（場景跳轉）</li>
                <li>可點擊「分享連結」複製台本網址</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">發布台本</h2>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>登入後進入工作室，可建立並管理台本。</p>
              <ul className="list-disc pl-5 space-y-1 text-foreground/90">
                <li>在儀表板點選「新增台本」建立作品</li>
                <li>填寫標題、摘要、分類標籤</li>
                <li>設定公開狀態後，台本即可在首頁被發現</li>
                <li>可設定目標觀眾（全年齡 / 成人向）與授權類型</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">台本語法</h2>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>編輯器支援自訂劇本標記語法：</p>
              <ul className="list-disc pl-5 space-y-1 text-foreground/90">
                <li><code className="bg-muted px-1 rounded text-xs">&lt;t&gt; 場景名稱</code> — 場景標題</li>
                <li><code className="bg-muted px-1 rounded text-xs">/sfx 效果描述</code> — 音效說明</li>
                <li><code className="bg-muted px-1 rounded text-xs">/d 舞台指示</code> — 方向指示</li>
                <li>角色台詞直接輸入即可</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">作者頁面與組織</h2>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>登入後可在設定頁建立作者頁面（Persona）：</p>
              <ul className="list-disc pl-5 space-y-1 text-foreground/90">
                <li>設定筆名、頭像、個人簡介與社群連結</li>
                <li>作者頁面會顯示所有公開台本</li>
                <li>可加入或建立組織，與其他創作者合作</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">常見問題</h2>
            <div className="space-y-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">台本無法顯示？</p>
                <p>請確認台本已設為「公開」狀態。私人台本只有本人登入後才可看見。</p>
              </div>
              <div>
                <p className="font-medium text-foreground">如何匯出台本？</p>
                <p>進入編輯器後，點選右上角「匯出」，支援純文字（.txt）格式下載。</p>
              </div>
              <div>
                <p className="font-medium text-foreground">成人向台本如何管理？</p>
                <p>設定目標觀眾為「成人向」後，閱讀頁會顯示年齡確認提示。</p>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground underline">← 返回台本列表</Link>
          <Link href="/about" className="hover:text-foreground underline">關於我們</Link>
          <Link href="/license" className="hover:text-foreground underline">授權說明</Link>
        </div>
      </div>
    </div>
  );
}
