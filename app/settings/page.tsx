import { createClient } from '@/lib/supabase/server';
import SettingsForm from '@/components/SettingsForm';

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profile')
    .select('*')
    .eq('id', user!.id)
    .single();

  return (
    <div className="max-w-2xl px-6 py-10 pb-24 md:pb-10">
      <h1 className="font-display text-3xl text-text mb-1">Settings</h1>
      <p className="text-muted mb-8">
        Your master CV and voice. Every generated kit is built from what's here — nothing else.
      </p>
      <SettingsForm profile={profile} userId={user!.id} />
    </div>
  );
}
