import type { Metadata } from "next";
import { PublicInfoPageShell } from "@/components/info/PublicInfoPageShell";
import { PublicInfoSection } from "@/components/info/PublicInfoSection";
import { BASE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "授權說明｜泛用型產品作坊",
  description: "泛用型產品作坊台本授權體系說明：CC 授權、商業使用、衍生創作規則。",
  alternates: { canonical: `${BASE_URL}/license` },
  openGraph: {
    title: "授權說明｜泛用型產品作坊",
    description: "泛用型產品作坊台本授權體系說明：CC 授權、商業使用、衍生創作規則。",
    url: `${BASE_URL}/license`,
    siteName: "泛用型產品作坊",
    locale: "zh_TW",
  },
};

export default function LicensePage() {
  return (
    <PublicInfoPageShell
      title="授權說明"
      description="台本創作授權體系"
      activeKey="license"
      relatedLinks={[
        { href: "/", label: "← 返回台本列表" },
        { href: "/about", label: "關於我們" },
        { href: "/help", label: "使用說明" },
      ]}
    >
      <div className="space-y-8">
        <PublicInfoSection title="授權原則">
          <p className="text-sm text-muted-foreground leading-relaxed">
            泛用型產品作坊上的台本由創作者自行設定授權條款。
            平台提供標準化的授權選項，讓使用者能清楚了解每部台本的使用範圍。
            未特別標示時，所有台本版權歸原作者所有，未經授權不得轉載或改作。
          </p>
        </PublicInfoSection>

        <PublicInfoSection title="授權類型">
          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
              <h3 className="font-semibold text-sm mb-1">保留所有權利（All Rights Reserved）</h3>
              <p className="text-sm text-muted-foreground">
                預設狀態。未經作者明確許可，不得複製、改作、演出或商業使用。
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
              <h3 className="font-semibold text-sm mb-1">創作共用（Creative Commons）</h3>
              <p className="text-sm text-muted-foreground mb-2">
                作者可選擇不同 CC 授權組合，允許特定範圍的使用：
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 pl-4 list-disc">
                <li><strong>CC BY</strong> — 姓名標示，可商業使用與改作</li>
                <li><strong>CC BY-NC</strong> — 姓名標示，非商業使用</li>
                <li><strong>CC BY-ND</strong> — 姓名標示，禁止改作</li>
                <li><strong>CC BY-SA</strong> — 姓名標示，相同方式分享</li>
                <li><strong>CC BY-NC-SA</strong> — 非商業、相同方式分享</li>
                <li><strong>CC BY-NC-ND</strong> — 非商業、禁止改作</li>
              </ul>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
              <h3 className="font-semibold text-sm mb-1">自訂授權</h3>
              <p className="text-sm text-muted-foreground">
                作者可填寫自訂授權條款，詳情請直接聯繫作者。
              </p>
            </div>
          </div>
        </PublicInfoSection>

        <PublicInfoSection title="商業使用與衍生創作">
          <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
            <p>台本閱讀頁會顯示作者設定的授權資訊，包含：</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground/90">
              <li><strong>商業使用</strong>：是否允許用於商業目的配音、演出</li>
              <li><strong>衍生創作</strong>：是否允許改編、二次創作</li>
              <li><strong>修改通知</strong>：修改時是否需通知原作者</li>
              <li><strong>特殊條款</strong>：作者附加的特定使用規定</li>
            </ul>
            <p className="mt-2">
              如需使用台本，請仔細閱讀授權資訊，並在必要時取得作者同意。
            </p>
          </div>
        </PublicInfoSection>

        <PublicInfoSection title="平台免責聲明">
          <p className="text-sm text-muted-foreground leading-relaxed">
            泛用型產品作坊僅提供技術平台，不對台本內容的授權有效性負責。
            使用者使用台本前應自行確認授權條款。
            若有侵權疑慮，請聯繫我們。
          </p>
        </PublicInfoSection>
      </div>
    </PublicInfoPageShell>
  );
}
