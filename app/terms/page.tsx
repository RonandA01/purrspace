import Link from "next/link";
import { PawPrintIcon } from "@/components/PawPrintIcon";

export const metadata = {
  title: "Terms & Privacy · PurrSpace",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-paw-pink">
            <PawPrintIcon size={24} />
            <span className="font-bold text-lg text-foreground">
              Purr<span className="text-paw-pink">Space</span>
            </span>
          </Link>
        </div>

        <h1 className="text-2xl font-bold">Terms &amp; Data Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</p>

        <section className="space-y-3">
          <h2 className="font-semibold text-base">1. Acceptance of Terms</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            By creating an account or using PurrSpace, you agree to be bound by these Terms and our Privacy Policy. If you do not agree, please do not use the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-base">2. Data Privacy (Republic Act 10173 – Philippines)</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            PurrSpace complies with the Philippines <strong>Data Privacy Act of 2012 (R.A. 10173)</strong>. We collect only the personal information necessary to operate this service:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-foreground/80 pl-2">
            <li>Email address (for authentication)</li>
            <li>Display name and username (for your public profile)</li>
            <li>Profile picture and cover photo (optional, user-uploaded)</li>
            <li>Posts, comments, and interactions you create on the platform</li>
            <li>Device and usage data for security and performance</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-base">3. Your Rights (as a Data Subject)</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-foreground/80 pl-2">
            <li>Right to be informed about how your data is used</li>
            <li>Right to access your personal data</li>
            <li>Right to correct inaccurate data</li>
            <li>Right to erasure or blocking of your data</li>
            <li>Right to object to processing of your data</li>
            <li>Right to data portability</li>
          </ul>
          <p className="text-sm text-foreground/80">
            To exercise these rights, contact us at{" "}
            <a href="mailto:privacy@purrspace.app" className="text-paw-pink underline">
              privacy@purrspace.app
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-base">4. Data Sharing & Storage</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Your data is stored securely via Supabase (hosted infrastructure). We do not sell your personal data to third parties. We may share data with service providers strictly to operate PurrSpace, subject to equivalent privacy protections.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-base">5. Content Policy</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            You retain ownership of content you post. By posting, you grant PurrSpace a non-exclusive license to display it. You must not post content that is harmful, illegal, or violates the rights of others.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-base">6. Account Security</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            You are responsible for maintaining the confidentiality of your account credentials. Report any unauthorized access immediately.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-base">7. Changes to These Terms</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            We may update these terms periodically. Continued use of PurrSpace after changes constitutes acceptance of the new terms.
          </p>
        </section>

        <div className="pt-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-full bg-paw-pink px-5 py-2 text-sm font-semibold text-white hover:bg-paw-pink/90 transition-colors"
          >
            Back to Sign In 🐾
          </Link>
        </div>
      </div>
    </div>
  );
}
