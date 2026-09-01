import { createClient } from '@/lib/supabase/server';
import SettingsForm from '@/components/SettingsForm';

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profile')
    .select('name, email, phone, location, portfolio_url, linkedin_url, work_auth_notes, target_titles, exclude_companies')
    .eq('id', user!.id)
    .single();

  return (
    <div className="max-w-2xl px-6 py-10 pb-24 md:pb-10">
      <h1 className="font-display text-3xl text-text mb-1">Settings</h1>
      <p className="text-muted mb-8">
        Who you are and what you're looking for. Your CV and voice live in Kit Studio.
      </p>
      <SettingsForm profile={profile} userId={user!.id} />
    </div>
  );
}
