import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Abstracted so a different provider (Gemini, Ollama, later Claude) can be
// swapped in without touching call sites. Keep this the only file that
// imports the groq-sdk directly.
export async function completeJSON<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
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
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.6,
  });

  return completion.choices[0]?.message?.content ?? '';
}
