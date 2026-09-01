import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import JobDetail from '@/components/JobDetail';

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user!.id)
    .single();

  if (!job) notFound();

  const { data: kit } = await supabase
    .from('kits')
    .select('*')
    .eq('job_id', job.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return <JobDetail job={job} kit={kit} />;
}
