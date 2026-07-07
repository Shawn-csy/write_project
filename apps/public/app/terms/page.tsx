import type { Metadata } from "next";
import { PublicInfoPageShell } from "@/components/info/PublicInfoPageShell";
import { BASE_URL, DEFAULT_OG_IMAGE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Terms of Service｜泛用型產品作坊",
  description: "泛用型產品作坊 terms of service — rules and guidelines for using the script and audio script platform.",
  alternates: { canonical: `${BASE_URL}/terms` },
  openGraph: {
    title: "Terms of Service｜泛用型產品作坊",
    description: "泛用型產品作坊 terms of service — rules and guidelines for using the script and audio script platform.",
    url: `${BASE_URL}/terms`,
    siteName: "泛用型產品作坊",
    images: [{ url: DEFAULT_OG_IMAGE_URL, width: 1200, height: 630 }],
  },
};

export default function TermsPage() {
  return (
    <PublicInfoPageShell
      title="Terms of Service"
      description="Last updated: May 27, 2026"
      relatedLinks={[{ href: "/", label: "← 返回台本列表" }]}
    >
      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">1. Acceptance of Terms</h2>
          <p>
            By accessing or using 泛用型產品作坊 (&ldquo;the Service&rdquo;) at{" "}
            <strong>open-scripts.shawnup.com</strong>, you agree to be bound by these Terms of
            Service. If you do not agree, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">2. Description of Service</h2>
          <p>
            泛用型產品作坊 is a platform for writing, reading, and sharing screenplays,
            voice scripts, audio drama scripts, and related script works. Features include
            script creation, public sharing, and export to Google Docs.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">3. User Accounts</h2>
          <p>
            You must sign in with a Google account to use certain features. You are responsible for
            all activity under your account. We reserve the right to suspend or terminate accounts
            that violate these terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">4. User Content</h2>
          <p>
            You retain ownership of scripts and content you create. By publishing content publicly,
            you grant us a non-exclusive, royalty-free license to display that content on the
            Service. You are solely responsible for ensuring your content does not infringe
            third-party rights.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">5. Prohibited Conduct</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Uploading content that is illegal, harmful, or infringes copyright</li>
            <li>Attempting to reverse engineer or compromise the Service</li>
            <li>Using the Service to send spam or automated requests</li>
            <li>Impersonating other users or entities</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">6. Google Services Integration</h2>
          <p>
            When you use the Google Docs export feature, you authorize the Service to act on your
            behalf to create documents in your Google account. This access is governed by
            Google&rsquo;s Terms of Service in addition to these terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">7. Disclaimer of Warranties</h2>
          <p>
            The Service is provided &ldquo;as is&rdquo; without warranties of any kind. We do not
            guarantee uninterrupted availability or that the Service will be error-free.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, we are not liable for any indirect, incidental,
            or consequential damages arising from your use of the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">9. Changes to Terms</h2>
          <p>
            We may update these terms at any time. Continued use of the Service after changes
            constitutes acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">10. Contact</h2>
          <p>
            For questions about these terms, contact us at:{" "}
            <a href="mailto:silence0603@gmail.com" className="underline hover:text-foreground">
              silence0603@gmail.com
            </a>
          </p>
        </section>
      </div>
    </PublicInfoPageShell>
  );
}
