import type { Metadata } from "next";
import { PublicInfoPageShell } from "@/components/info/PublicInfoPageShell";
import { PublicInfoSection } from "@/components/info/PublicInfoSection";
import {
  PublicInfoDocument,
  PublicInfoLead,
  PublicInfoBelowFold,
} from "@/components/info/PublicInfoDocument";
import { BASE_URL } from "@/lib/seo";

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
    <PublicInfoPageShell
      title="使用說明"
      description="泛用型產品作坊平台操作指南"
      activeKey="help"
      relatedLinks={[
        { href: "/", label: "← 返回台本列表" },
        { href: "/about", label: "關於我們" },
        { href: "/license", label: "授權說明" },
      ]}
    >
      <PublicInfoDocument>
        {/* Lead — three-step summary, first viewport */}
        <PublicInfoLead>
          <p>泛用型產品作坊讓你免費閱讀台本、管理作品，以及與其他創作者合作。</p>
          <ol className="list-decimal pl-5 space-y-2 text-foreground/90">
            <li>
              <strong>找台本</strong>——在首頁瀏覽公開台本，不需登入。
              點擊封面或標題進入閱讀頁，可調整字體、行距與主題色。
            </li>
            <li>
              <strong>閱讀與分享</strong>——閱讀頁支援目錄導覽（場景跳轉），
              可複製台本連結分享給他人。
            </li>
            <li>
              <strong>建立與發布</strong>——登入後進入工作室，新增台本、填寫標題與標籤，
              設定公開後即可在首頁被發現。
            </li>
          </ol>
        </PublicInfoLead>

        {/* Below fold — detailed help sections */}
        <PublicInfoBelowFold>
          <PublicInfoSection title="台本語法">
            <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>編輯器支援自訂劇本標記語法：</p>
              <ul className="list-disc pl-5 space-y-1 text-foreground/90">
                <li><code className="bg-muted px-1 rounded text-xs">&lt;t&gt; 場景名稱</code> — 場景標題</li>
                <li><code className="bg-muted px-1 rounded text-xs">/sfx 效果描述</code> — 音效說明</li>
                <li><code className="bg-muted px-1 rounded text-xs">/d 舞台指示</code> — 方向指示</li>
                <li>角色台詞直接輸入即可</li>
              </ul>
            </div>
          </PublicInfoSection>

          <PublicInfoSection title="作者頁面與組織">
            <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>登入後可在設定頁建立作者頁面（Persona）：</p>
              <ul className="list-disc pl-5 space-y-1 text-foreground/90">
                <li>設定筆名、頭像、個人簡介與社群連結</li>
                <li>作者頁面會顯示所有公開台本</li>
                <li>可加入或建立組織，與其他創作者合作</li>
              </ul>
            </div>
          </PublicInfoSection>

          <PublicInfoSection title="常見問題">
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
          </PublicInfoSection>
        </PublicInfoBelowFold>
      </PublicInfoDocument>
    </PublicInfoPageShell>
  );
}
