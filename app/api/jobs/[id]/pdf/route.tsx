import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// ATS-safe: single column, system font, no icons/text boxes in the layer.
// We keep markdown headings (#, ##) as visual weight but strip the syntax —
// ATS parsers choke on raw markdown characters.
const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10.5, fontFamily: 'Helvetica', lineHeight: 1.4, color: '#111' },
  h1: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  h2: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 12, marginBottom: 4 },
  p: { marginBottom: 4 },
  bullet: { marginBottom: 2, marginLeft: 10 },
});

function MarkdownToPdf({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n');
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('# ')) {
            return <Text key={i} style={styles.h1}>{trimmed.slice(2)}</Text>;
          }
          if (trimmed.startsWith('## ')) {
            return <Text key={i} style={styles.h2}>{trimmed.slice(3)}</Text>;
          }
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return <Text key={i} style={styles.bullet}>{`•  ${trimmed.slice(2)}`}</Text>;
          }
          if (trimmed === '') {
            return <View key={i} style={{ height: 4 }} />;
          }
          return <Text key={i} style={styles.p}>{trimmed.replace(/\*\*/g, '')}</Text>;
        })}
      </Page>
    </Document>
  );
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: job } = await supabase
    .from('jobs')
    .select('id, company, title')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  const { data: kit } = await supabase
    .from('kits')
    .select('tailored_cv_md')
    .eq('job_id', job.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!kit?.tailored_cv_md) {
    return NextResponse.json({ error: 'No kit generated yet' }, { status: 404 });
  }

  const buffer = await renderToBuffer(<MarkdownToPdf markdown={kit.tailored_cv_md} />);
  const filename = `CV - ${job.company} - ${job.title}.pdf`.replace(/[^\w\s.-]/g, '');

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
