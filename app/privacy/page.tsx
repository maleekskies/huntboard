import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Privacy Policy' };

// TEMPLATE: written to match what the app actually does today. Have it
// reviewed against the laws that apply to where you and your users are
// (e.g. NDPR/NDPA in Nigeria, GDPR for EU users) before launch, and set
// NEXT_PUBLIC_CONTACT_EMAIL so people can reach you.
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-bg px-6 py-12">
      <article className="max-w-2xl mx-auto text-sm text-muted leading-relaxed">
        <Link href="/" className="text-accent text-xs">← Back to Huntboard</Link>
        <h1 className="font-display text-3xl text-text mt-4 mb-1">Privacy Policy</h1>
        <p className="mb-8">Last updated: October 14, 2026</p>

        <Section title="What Huntboard is">
          Huntboard is a personal job-search tool. It scores public job listings against the profile you
          enter and helps you prepare application material. It never applies to anything on your behalf.
        </Section>

        <Section title="What we collect">
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>Your email address, used to sign you in with a magic link.</li>
            <li>
              What you enter in your profile: name, phone, location, links, work-authorization notes, target
              titles, preferences, languages, your CV text, voice guide and proof points.
            </li>
            <li>Jobs in your Inbox and pipeline, their scores, notes, dates, and the kits you generate.</li>
            <li>Which roles you rejected and why, and simple daily usage counters that enforce fair-use limits.</li>
          </ul>
          We do not use advertising or analytics trackers. The only cookies are the ones that keep you signed in.
        </Section>

        <Section title="How we use it">
          To score listings for you, to generate tailored CVs, cover letters and talking points when you open
          a job, and, only if you turn it on, to email you a daily digest of new matches. We do not sell your
          data and we do not use it to train models.
        </Section>

        <Section title="Who else handles your data">
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>Supabase: stores your account and data (database hosted in Ireland, EU West).</li>
            <li>Vercel: hosts the app.</li>
            <li>
              Groq: when you generate a kit, the relevant parts of your CV, profile and the job description are
              sent to Groq to produce the text. This is the only third party that sees your CV content.
            </li>
            <li>Resend: delivers sign-in and digest emails, so it sees your email address and the email content.</li>
          </ul>
          Job boards are queried for public listings only. None of your personal data is sent to them or to
          employers.
        </Section>

        <Section title="Keeping and deleting your data">
          Your data stays until you delete it. You can export everything as JSON and permanently delete your
          account, including all of your data, from Settings at any time.
        </Section>

        <Section title="Your rights">
          You can access, correct, export and delete your data from within the app. If you want help, or have
          a question or complaint about how your data is handled, contact us
          {CONTACT ? (
            <>
              {' '}at <a className="text-accent underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>
            </>
          ) : (
            ' using the contact details of the site operator'
          )}
          .
        </Section>

        <Section title="Changes">
          If this policy changes in a meaningful way, we will update the date above and, for significant
          changes, tell you in the app.
        </Section>

        <p className="mt-10">
          See also the <Link href="/terms" className="text-accent underline">Terms of Use</Link>.
        </p>
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
