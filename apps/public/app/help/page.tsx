import type { Metadata } from "next";
import { PublicInfoPageShell } from "@/components/info/PublicInfoPageShell";
import { PublicInfoSection } from "@/components/info/PublicInfoSection";
import { PublicInfoDocument, PublicInfoLead, PublicInfoBelowFold } from "@/components/info/PublicInfoDocument";
import { JsonLdScript } from "@/lib/jsonLd";
import { BASE_URL, DEFAULT_OG_IMAGE_URL } from "@/lib/seo";
import { studioUrl } from "@/lib/studioUrl";

export const revalidate = 3600;

const description = "公開台本、音聲作品、Demo 與創作資源的瀏覽、投稿及資料補充說明。";
const linkClass = "font-medium text-primary underline underline-offset-2 hover:text-primary/80";

export const metadata: Metadata = {
  title: "使用說明｜泛用型產品作坊",
  description,
  alternates: { canonical: `${BASE_URL}/help` },
  openGraph: {
    title: "使用說明｜泛用型產品作坊",
    description,
    url: `${BASE_URL}/help`,
    siteName: "泛用型產品作坊",
    locale: "zh_TW",
    images: [{ url: DEFAULT_OG_IMAGE_URL, width: 1200, height: 630 }],
  },
};

export default function HelpPage() {
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "瀏覽與投稿需要登入嗎？",
        acceptedAnswer: { "@type": "Answer", text: "瀏覽公開頁面，以及使用公開台本、音聲作品、Demo 和資源投稿表單，不需登入。管理自己創作的台本請進入工作室。" },
      },
      {
        "@type": "Question",
        name: "投稿後為什麼沒有立刻顯示？",
        acceptedAnswer: { "@type": "Answer", text: "公開投稿會先由管理員核對資料；審核通過後才會出現在對應頁面。已有頁面的資料可在該頁送出補充或更新。" },
      },
      {
        "@type": "Question",
        name: "外部收錄的台本可以直接使用嗎？",
        acceptedAnswer: { "@type": "Answer", text: "請先開啟原始來源，確認作者在來源頁公布的授權與使用條件。本站收錄作品資訊不代表取得演出、改作或商業使用許可。" },
      },
    ],
  };

  return (
    <PublicInfoPageShell
      title="使用說明"
      relatedLinks={[
        { href: "/", label: "← 返回公開台本" },
        { href: "/about", label: "關於我們" },
        { href: "/license", label: "授權說明" },
      ]}
    >
      <JsonLdScript data={faqData} />
      <PublicInfoDocument>
        <PublicInfoLead>
          <p>本站可瀏覽公開台本、音聲作品、演出 Demo，以及聲演、後製、封面和錄音室等創作資源。瀏覽公開內容與使用投稿表單不需登入。</p>
          <ol className="list-decimal space-y-2 pl-5 text-foreground/90">
            <li><strong>找內容</strong>：從首頁、音聲作品、Demo 或資源頁搜尋與篩選。</li>
            <li><strong>看來源與授權</strong>：本站台本可進入閱讀頁；外部收錄作品請開啟原始來源，確認使用條件。</li>
            <li><strong>投稿或補充</strong>：各頁的投稿表單會將資料送交管理員，核准後才會公開。</li>
          </ol>
        </PublicInfoLead>

        <PublicInfoBelowFold>
          <PublicInfoSection title="公開台本：搜尋與閱讀">
            <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              <p>在<a href="/" className={linkClass}>公開台本首頁</a>選擇全年齡向、成人向、男性向或女性向，搜尋標題、作者或標籤；「有 Demo」可只看附有演出試聽的台本。</p>
              <p>點選本站台本的封面或標題即可閱讀。閱讀頁提供文字顯示設定與作品資訊；部分內容會先顯示年齡或授權確認。外部收錄的台本會導向原始來源，閱讀方式依來源網站而定。</p>
            </div>
          </PublicInfoSection>

          <PublicInfoSection title="投稿公開台本與管理自己的作品">
            <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              <p>首頁的「投稿台本」可提供台本名稱、作者與公開文件連結，並補充介紹、封面等資料。送出後由管理員核對，核准才會出現在公開列表；投稿表單不會直接建立可編輯的工作室台本。</p>
              <p>如果要建立或管理自己的台本，請使用導覽列的<a href={studioUrl()} className={linkClass}>工作室</a>。公開頁上的作者與組織資料，也可能包含本站收錄的外部創作者資訊。</p>
            </div>
          </PublicInfoSection>

          <PublicInfoSection title="音聲作品與 Demo">
            <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              <p><a href="/audio-works" className={linkClass}>音聲作品</a>頁依社團瀏覽作品，可能連往第三方試聽或販售頁。進入頁面前需確認已年滿 18 歲；作品可能分為免費與付費。使用「投稿作品」提供作品與來源連結，審核通過後才會公開。</p>
              <p><a href="/demos" className={linkClass}>Demo</a> 頁展示與公開台本對應的演出試聽。投稿時先選擇對應台本，再填入公開 Demo 連結及聲演資料；名單外聲演也可一併提供。審核通過後會連到對應台本與聲演身份頁。</p>
            </div>
          </PublicInfoSection>

          <PublicInfoSection title="創作資源：新增與補充資料">
            <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              <p><a href="/resources" className={linkClass}>資源頁</a>收錄聲演、後製、封面與錄音室，可搜尋名稱、查看聯絡連結與參與作品。參與作品可為音聲、遊戲、影片或其他類型；部分作品圖片會在年齡確認後顯示。</p>
              <p>新增資源請使用「投稿資源」。聲演的參與作品可選填；其他類別至少需要一部有名稱與網址的參與作品，並提供官方、委託或社群連結。已有資源頁時，請進入該頁使用「補充／更新資源資料」。兩種提交都須經管理員審核。</p>
            </div>
          </PublicInfoSection>

          <PublicInfoSection title="授權與資料更正">
            <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              <p>閱讀、演出、轉載或改作前，請查看每部台本的<a href="/license" className={linkClass}>授權資訊</a>及特殊條款。外部收錄作品以原始來源公布的條件為準；本站展示作品或資源資料，不代表授予使用許可。</p>
              <p>如果作者、作品或資源資料有誤，可在相關頁面送出補充；若涉及權益、下架或其他問題，請透過<a href="/about" className={linkClass}>聯絡方式</a>告知我們。</p>
            </div>
          </PublicInfoSection>

          <PublicInfoSection title="常見問題">
            <div className="space-y-4 text-sm text-muted-foreground">
              <div><p className="font-medium text-foreground">瀏覽與投稿需要登入嗎？</p><p>公開頁面與投稿表單可直接使用；管理自己建立的台本請進入工作室。</p></div>
              <div><p className="font-medium text-foreground">投稿後為什麼沒有立刻顯示？</p><p>新投稿與資料補充都會先經過審核，核准後才會更新公開頁面。</p></div>
              <div><p className="font-medium text-foreground">外部收錄的台本可以直接使用嗎？</p><p>請先查看原始來源的授權與作者要求；本站收錄不等於取得使用許可。</p></div>
            </div>
          </PublicInfoSection>
        </PublicInfoBelowFold>
      </PublicInfoDocument>
    </PublicInfoPageShell>
  );
}
