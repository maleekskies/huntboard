import { createClient } from '@/lib/supabase/server';
import SettingsForm from '@/components/SettingsForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profile')
    .select('name, email, phone, location, portfolio_url, linkedin_url, work_auth_notes, target_titles, exclude_companies, locations, must_haves, deal_breakers, min_match, seniority, comp_floor, master_cv_text, voice_guide, proof_points, notify_digest')
    .eq('id', user!.id)
    .single();

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentRejections } = await supabase
    .from('rejections')
    .select('reason, term, created_at')
    .eq('user_id', user!.id)
    .gte('created_at', fourteenDaysAgo)
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-2xl px-6 py-10 pb-24 md:pb-10">
      <h1 className="font-display text-3xl text-text mb-1">Settings</h1>
      <p className="text-muted mb-8">
        The matcher's brain: who you are, what you're looking for, and your master CV.
      </p>
      <SettingsForm profile={profile} userId={user!.id} />

      {recentRejections && recentRejections.length > 0 && (
        <div className="mt-10 pt-8 border-t border-border">
          <h2 className="text-sm font-medium text-text mb-1">Recent teaching</h2>
          <p className="text-xs text-muted mb-3">
            Rejections from the last 14 days, softly downranking similar roles. Expires on its own.
          </p>
          <ul className="flex flex-col gap-2">
            {recentRejections.map((r, i) => (
              <li key={i} className="text-xs text-muted bg-surface border border-border rounded px-3 py-2">
                <span className="text-text">{r.reason}</span>: downranking roles mentioning "{r.term}"
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
