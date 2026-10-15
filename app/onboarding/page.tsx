import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import OnboardingWizard from '@/components/OnboardingWizard';

export const metadata: Metadata = { title: 'Set up your profile' };
export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profile')
    .select('onboarded_at')
    .eq('id', user!.id)
    .maybeSingle();

  if (profile?.onboarded_at) redirect('/');

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-6 py-16">
      <OnboardingWizard userId={user!.id} />
    </div>
  );
}
