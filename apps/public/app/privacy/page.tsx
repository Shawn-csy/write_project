import type { Metadata } from "next";
import Link from "next/link";
import { PublicTopBar } from "@/components/PublicTopBar";
import { PublicShellActions } from "@/components/PublicShellActions";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://open-scripts.shawnup.com";

export const metadata: Metadata = {
  title: "Privacy Policy｜泛用型產品作坊",
  description:
    "泛用型產品作坊 privacy policy — how we collect, use, and protect your personal information.",
  alternates: { canonical: `${BASE_URL}/privacy` },
  openGraph: {
    title: "Privacy Policy｜泛用型產品作坊",
    description:
      "泛用型產品作坊 privacy policy — how we collect, use, and protect your personal information.",
    url: `${BASE_URL}/privacy`,
    siteName: "泛用型產品作坊",
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicTopBar showBack backHref="/" backLabel="返回" trailing={<PublicShellActions />} />
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: May 27, 2026</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">1. Overview</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This Privacy Policy describes how 泛用型產品作坊 (&ldquo;we&rdquo;, &ldquo;our&rdquo;,
            or &ldquo;us&rdquo;), operated at <strong>open-scripts.shawnup.com</strong>, collects,
            uses, and protects your personal information when you use our service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
          <p className="text-sm leading-relaxed text-muted-foreground mb-3">
            When you sign in with Google, we receive the following information from your Google account:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Email address</li>
            <li>Display name</li>
            <li>Profile photo URL</li>
          </ul>
          <p className="text-sm leading-relaxed text-muted-foreground mt-3">
            When you use the &ldquo;Export to Google Docs&rdquo; feature, we request a temporary
            OAuth access token for the following Google API scopes:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
            <li>
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                https://www.googleapis.com/auth/documents
              </code>{" "}
              &mdash; to create and write Google Docs
            </li>
            <li>
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                https://www.googleapis.com/auth/drive.file
              </code>{" "}
              &mdash; to save exported files to your Google Drive
            </li>
          </ul>
          <p className="text-sm leading-relaxed text-muted-foreground mt-3">
            These tokens are used only during the export operation and are not stored on our servers.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>To identify you and maintain your account</li>
            <li>To display your profile within the application</li>
            <li>To associate scripts and content you create with your account</li>
            <li>To export your scripts to Google Docs on your request</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">4. Data Storage and Security</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your account data (email, display name, profile photo URL) is stored in Firebase
            Firestore, operated by Google LLC. We do not store Google Docs or Drive access tokens
            beyond the duration of the export request. We take reasonable precautions to protect
            your data, but no system is completely secure.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">5. Data Sharing</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We do not sell, trade, or share your personal information with third parties, except as
            required to operate the service (e.g., Firebase/Google infrastructure) or as required by
            law.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">6. Google API Services</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Our use of information received from Google APIs adheres to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You may request deletion of your account and associated data at any time by contacting
            us. You can revoke Google OAuth permissions at any time via your{" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Google Account permissions page
            </a>
            .
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">8. Changes to This Policy</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We may update this policy from time to time. Changes will be posted on this page with an
            updated date. Continued use of the service after changes constitutes acceptance.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">9. Contact</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            For questions or data deletion requests, contact us at:{" "}
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
