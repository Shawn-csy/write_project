import type { Metadata } from "next";
import { PublicInfoPageShell } from "@/components/info/PublicInfoPageShell";
import { PublicInfoSection } from "@/components/info/PublicInfoSection";
import {
  PublicInfoDocument,
  PublicInfoLead,
  PublicInfoBelowFold,
} from "@/components/info/PublicInfoDocument";
import { BASE_URL, DEFAULT_OG_IMAGE_URL } from "@/lib/seo";
import { SITE_VERSION } from "@/lib/siteVersion";
import { JsonLdScript } from "@/lib/jsonLd";
import { createPublicInfoWebPageJsonLd } from "@/lib/publicInfoJsonLd";

export const revalidate = 3600;

const webPageJsonLd = createPublicInfoWebPageJsonLd({
  path: "/about",
  name: "關於｜泛用型產品作坊",
  description: "泛用型產品作坊收錄公開台本、音聲作品、演出 Demo 與創作資源。",
});

export const metadata: Metadata = {
  title: "關於｜泛用型產品作坊",
  description: "泛用型產品作坊收錄公開台本、音聲作品、演出 Demo 與創作資源。",
  alternates: { canonical: `${BASE_URL}/about` },
  openGraph: {
    title: "關於｜泛用型產品作坊",
    description: "泛用型產品作坊收錄公開台本、音聲作品、演出 Demo 與創作資源。",
    url: `${BASE_URL}/about`,
    siteName: "泛用型產品作坊",
    locale: "zh_TW",
    images: [{ url: DEFAULT_OG_IMAGE_URL, width: 1200, height: 630 }],
  },
};

export default function AboutPage() {
  return (
    <PublicInfoPageShell
      title="關於泛用型產品作坊"
      relatedLinks={[
        { href: "/", label: "← 返回台本列表" },
        { href: "/help", label: "使用說明" },
        { href: "/license", label: "授權說明" },
      ]}
    >
      <JsonLdScript data={webPageJsonLd} />
      <PublicInfoDocument>
        {/* Lead — plain text, first viewport */}
        <PublicInfoLead>
          <p>
            泛用型產品作坊由台灣獨立開發者打造，提供公開台本的閱讀與分享，也整理音聲作品、演出 Demo 及創作資源，方便讀者與創作者找到作品及合作夥伴。
          </p>
          <ul className="list-disc pl-5 space-y-2 text-foreground/90">
            <li><strong>公開台本</strong>：瀏覽本站台本與外部收錄作品，並查看來源和授權資訊。</li>
            <li><strong>音聲與 Demo</strong>：探索社團作品，以及與台本對應的演出試聽。</li>
            <li><strong>創作資源</strong>：尋找聲演、後製、封面創作者及錄音室，查看參與作品與聯絡方式。</li>
            <li><strong>工作室</strong>：創作者可進入工作室管理自己的台本。</li>
          </ul>
          <p>
            平台持續開發中，歡迎回報問題或建議。聯絡方式請見下方。
          </p>
          <p>
            若作品或資料涉及權益問題，或希望更正、移除收錄內容，請透過下方聯絡方式告知我們。新增台本、音聲作品、Demo 或資源，可先使用各頁的投稿表單送交審核。
          </p>
          <p>
            如果希望網站新增或調整功能，或有程式開發委託，也歡迎透過下方 Discord 私訊或 Email 聯絡。合作費用可依內容討論，也可以作品抵銷。
          </p>
        </PublicInfoLead>

        {/* Below fold — cards, update list, contact */}
        <PublicInfoBelowFold>
          <PublicInfoSection title="版本資訊" icon="◇" card>
            <div className="flex items-center justify-between rounded-lg border bg-background px-4 py-3 text-sm">
              <span className="text-muted-foreground">網站版本</span>
              <span className="font-mono font-semibold text-foreground">v{SITE_VERSION}</span>
            </div>
          </PublicInfoSection>

          <PublicInfoSection title="近期更新" icon="↻" card>
            <ul className="space-y-3 text-sm">
              <li className="rounded-lg border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">2026 年 11 月</div>
                <div className="mt-1 font-medium text-foreground">創作資源與投稿流程</div>
                <div className="mt-1 text-muted-foreground">
                  資源頁整合聲演、後製、封面與錄音室；新資料與既有頁面的補充可提交審核。
                </div>
              </li>
              <li className="rounded-lg border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">2026 年 11 月</div>
                <div className="mt-1 font-medium text-foreground">音聲作品與演出 Demo</div>
                <div className="mt-1 text-muted-foreground">
                  可依社團瀏覽音聲作品，並查看台本對應的公開演出試聽及聲演身份。
                </div>
              </li>
              <li className="rounded-lg border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">2026 年 10 月</div>
                <div className="mt-1 font-medium text-foreground">收錄更多公開台本</div>
                <div className="mt-1 text-muted-foreground">
                  公開台本列表也展示外部來源作品，保留作者、封面、摘要與原始連結。
                </div>
              </li>
            </ul>
          </PublicInfoSection>

          <PublicInfoSection title="聯絡我們" icon="✉" card>
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
          </PublicInfoSection>
        </PublicInfoBelowFold>
      </PublicInfoDocument>
    </PublicInfoPageShell>
  );
}
