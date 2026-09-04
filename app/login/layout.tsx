import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to Huntboard with a magic link. Roles scored against your profile, nothing sends until you approve it.',
  alternates: {
    canonical: 'https://huntboard-nu.vercel.app/login',
  },
  openGraph: {
    title: 'Huntboard',
    description: 'Roles scored against your profile. Nothing sends until you say so.',
    url: 'https://huntboard-nu.vercel.app/login',
    type: 'website',
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
