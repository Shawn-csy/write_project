import type { Metadata } from "next";
import Link from "next/link";
import { PublicTopBar } from "@/components/PublicTopBar";
import { PublicShellActions } from "@/components/PublicShellActions";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://open-scripts.shawnup.com";

export const metadata: Metadata = {
  title: "Terms of Service｜泛用型產品作坊",
  description: "泛用型產品作坊 terms of service — rules and guidelines for using the platform.",
  alternates: { canonical: `${BASE_URL}/terms` },
  openGraph: {
    title: "Terms of Service｜泛用型產品作坊",
    description: "泛用型產品作坊 terms of service — rules and guidelines for using the platform.",
    url: `${BASE_URL}/terms`,
    siteName: "泛用型產品作坊",
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicTopBar showBack backHref="/" backLabel="返回" trailing={<PublicShellActions />} />
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: May 27, 2026</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            By accessing or using 泛用型產品作坊 (&ldquo;the Service&rdquo;) at{" "}
            <strong>open-scripts.shawnup.com</strong>, you agree to be bound by these Terms of
            Service. If you do not agree, do not use the Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            泛用型產品作坊 is a platform for writing, reading, and sharing screenplays and
            scripts. Features include script creation, public sharing, and export to Google Docs.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You must sign in with a Google account to use certain features. You are responsible for
            all activity under your account. We reserve the right to suspend or terminate accounts
            that violate these terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">4. User Content</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You retain ownership of scripts and content you create. By publishing content publicly,
            you grant us a non-exclusive, royalty-free license to display that content on the
            Service. You are solely responsible for ensuring your content does not infringe
            third-party rights.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">5. Prohibited Conduct</h2>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Uploading content that is illegal, harmful, or infringes copyright</li>
            <li>Attempting to reverse engineer or compromise the Service</li>
            <li>Using the Service to send spam or automated requests</li>
            <li>Impersonating other users or entities</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">6. Google Services Integration</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            When you use the Google Docs export feature, you authorize the Service to act on your
            behalf to create documents in your Google account. This access is governed by
            Google&rsquo;s Terms of Service in addition to these terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">7. Disclaimer of Warranties</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The Service is provided &ldquo;as is&rdquo; without warranties of any kind. We do not
            guarantee uninterrupted availability or that the Service will be error-free.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">8. Limitation of Liability</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            To the maximum extent permitted by law, we are not liable for any indirect, incidental,
            or consequential damages arising from your use of the Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">9. Changes to Terms</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We may update these terms at any time. Continued use of the Service after changes
            constitutes acceptance of the new terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">10. Contact</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            For questions about these terms, contact us at:{" "}
            <a href="mailto:silence0603@gmail.com" className="underline hover:text-foreground">
              silence0603@gmail.com
            </a>
          </p>
        </section>

        <div className="mt-10 pt-6 border-t border-border">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground underline">
            ← 返回台本列表
          </Link>
        </div>
      </div>
    </div>
  );
}
