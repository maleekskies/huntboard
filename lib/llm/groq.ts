import Groq from 'groq-sdk';

// Groq deprecated llama-3.3-70b-versatile (announced June 17, 2026,
// decommissioned August 16, 2026). This is their recommended replacement.
const MODEL = 'openai/gpt-oss-120b';

// Lazy singleton: instantiating Groq({ apiKey }) at module load time throws
// during Next's build-time page-data collection if the key isn't present in
// that environment, even though it's only ever actually needed at runtime.
let _groq: Groq | null = null;
function getGroq(): Groq {
  if (!_groq) {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
}

// Abstracted so a different provider (Gemini, Ollama, later Claude) can be
// swapped in without touching call sites. Keep this the only file that
// imports the groq-sdk directly.
export async function completeJSON<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const completion = await getGroq().chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.4,
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  return JSON.parse(raw) as T;
}

export async function completeText(systemPrompt: string, userPrompt: string): Promise<string> {
  const completion = await getGroq().chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.6,
  });

  return completion.choices[0]?.message?.content ?? '';
}
