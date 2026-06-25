import type { Metadata } from "next";
import Link from "next/link";
import { MarkdownContent } from "@/components/markdown-content";
import { partnerAgreementMarkdown } from "@/lib/partner-agreement-content";
import { getPartnerProgramAgreementText } from "@/server/partner-applications";

export const metadata: Metadata = {
  title: "Партнёрское соглашение, StarVedas",
  description:
    "Документ партнёрской программы StarVedas для кураторов и партнёров."
};

export const dynamic = "force-dynamic";

export default async function PartnerAgreementPage() {
  const savedAgreementText = await getPartnerProgramAgreementText();
  const content = savedAgreementText.trim() || partnerAgreementMarkdown;

  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="eyebrow">Юридические документы</p>
        <MarkdownContent content={content} />

        <div className="legal-actions">
          <Link className="button button--primary" href="/cabinet">
            В кабинет куратора
          </Link>
          <Link className="button" href="/legal/offer">
            Публичная оферта
          </Link>
        </div>
      </article>
    </main>
  );
}
