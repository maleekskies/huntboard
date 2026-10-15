import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Terms of Use' };

// TEMPLATE: have this reviewed before launch, and add the governing law and
// jurisdiction that apply to you (deliberately not guessed here).
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-bg px-6 py-12">
      <article className="max-w-2xl mx-auto text-sm text-muted leading-relaxed">
        <Link href="/" className="text-accent text-xs">← Back to Huntboard</Link>
        <h1 className="font-display text-3xl text-text mt-4 mb-1">Terms of Use</h1>
        <p className="mb-8">Last updated: October 14, 2026</p>

        <Section title="The service">
          Huntboard scores public job listings against the profile you provide and helps you draft application
          material. It is provided free, as is, and may change or stop at any time.
        </Section>

        <Section title="You stay in control">
          Nothing is ever sent to an employer by Huntboard. You review everything and apply yourself, on the
          employer's own site. AI-generated CVs, cover letters and talking points can contain mistakes: check
          every claim against your real experience before you use it. You are responsible for what you submit.
        </Section>

        <Section title="No promises about results">
          Match scores are estimates from keywords and AI, not a judgement of your suitability, and listings
          come from third-party boards that may be wrong, outdated or removed. We do not guarantee interviews,
          offers or the accuracy or availability of any listing.
        </Section>

        <Section title="Fair use">
          Daily limits apply to scans, kit generations, pasted links and CV uploads so the service stays
          available to everyone. Do not abuse the service: no automated or bulk use beyond the app itself, no
          attempts to access other people's data, probe or disrupt the system, or use it for anything unlawful.
          We may limit or close accounts that do.
        </Section>

        <Section title="Your content">
          Your CV and other content stay yours. You give us permission to store and process them only to
          provide the service to you, as described in the <Link href="/privacy" className="text-accent underline">Privacy Policy</Link>.
          Only upload content you have the right to use.
        </Section>

        <Section title="Ending your account">
          You can delete your account and data at any time in Settings.
        </Section>

        <Section title="Liability">
          To the fullest extent the law allows, the service is provided without warranties, and we are not
          liable for indirect or consequential losses, or for decisions you make based on the service.
        </Section>

        <Section title="Contact">
          {CONTACT ? (
            <>Questions: <a className="text-accent underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>.</>
          ) : (
            'Questions can be sent to the site operator.'
          )}
        </Section>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="text-text font-medium text-base mb-2">{title}</h2>
      <div>{children}</div>
    </section>
  );
}
