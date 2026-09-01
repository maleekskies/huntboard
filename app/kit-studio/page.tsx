import { createClient } from '@/lib/supabase/server';
import KitStudioForm from '@/components/KitStudioForm';

export default async function KitStudioPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profile')
    .select('master_cv_text, voice_guide, proof_points')
    .eq('id', user!.id)
    .single();

  return (
    <div className="max-w-2xl px-6 py-10 pb-24 md:pb-10">
      <h1 className="font-display text-3xl text-text mb-1">Kit Studio</h1>
      <p className="text-muted mb-8">
        Your CV, your voice, your proof. Every tailored CV and cover letter is built only from
        what's here.
      </p>
      <KitStudioForm profile={profile} userId={user!.id} />
    </div>
  );
}
