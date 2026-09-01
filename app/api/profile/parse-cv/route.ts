import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force Node runtime: pdf-parse needs Node APIs not available on the Edge.
export const runtime = 'nodejs';

const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB, generous for a CV

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'File too large (max 8MB)' }, { status: 400 });
  }

  try {
    // pdf-parse's own index.js runs a debug code path on import that tries
    // to read a hardcoded test file ('./test/data/05-versions-space.pdf'),
    // which crashes here regardless of how it's imported. Going straight to
    // its internal lib file bypasses that broken wrapper entirely.
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await pdfParse(buffer);

    const text = result.text.trim();
    if (!text) {
      return NextResponse.json(
        { error: "Couldn't extract text from that PDF. It may be a scanned image rather than real text." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text, pages: result.numpages });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to parse PDF: ${err instanceof Error ? err.message : 'unknown error'}` },
      { status: 500 }
    );
  }
}
