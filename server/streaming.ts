import { stripCodeFences, ensureRenderCall } from './generator';
import { withModelFallback } from './fallback';
import { SYSTEM_PROMPT, GOOGLE_MODELS } from './prompts';

export interface StreamEvent {
  type: 'chunk' | 'done' | 'error';
  text?: string;
  code?: string;
  message?: string;
}

export async function streamAnthropic(
  prompt: string,
  apiKey: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body not readable');

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (line.startsWith('event: ')) {
          // 이벤트 라인은 무시
          continue;
        }

        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          try {
            const data = JSON.parse(dataStr);

            if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
              const text = data.delta.text;
              fullText += text;
              onChunk(text);
            }
          } catch (e) {
            console.warn('[Anthropic Stream] JSON parse failed:', {
              dataStr: dataStr.slice(0, 100),
              error: e instanceof Error ? e.message : 'Unknown',
            });
          }
        }
      }

      buffer = lines[lines.length - 1];
    }

    // 남은 버퍼 처리
    if (buffer.trim()) {
      try {
        const dataStr = buffer.startsWith('data: ') ? buffer.slice(6) : buffer;
        const data = JSON.parse(dataStr);
        if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
          const text = data.delta.text;
          fullText += text;
          onChunk(text);
        }
      } catch (e) {
        console.warn('[Anthropic Stream] Final buffer parse failed:', {
          buffer: buffer.slice(0, 100),
          error: e instanceof Error ? e.message : 'Unknown',
        });
      }
    }
  } finally {
    reader.releaseLock();
  }

  return ensureRenderCall(stripCodeFences(fullText));
}

async function streamGoogleModel(
  prompt: string,
  apiKey: string,
  model: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stream: true,
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 8192 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body not readable');

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const data = JSON.parse(line);
          const candidate = data.candidates?.[0];

          if (candidate?.finishReason === 'MAX_TOKENS') {
            throw new Error('생성된 코드가 너무 길어 잘렸습니다. 더 간단한 컴포넌트를 요청해주세요.');
          }

          if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
              if (part.text) {
                fullText += part.text;
                onChunk(part.text);
              }
            }
          }
        } catch (e) {
          console.warn('[Google Stream] JSON parse failed:', {
            line: line.slice(0, 100),
            error: e instanceof Error ? e.message : 'Unknown',
          });
        }
      }

      buffer = lines[lines.length - 1];
    }

    // 남은 버퍼 처리
    if (buffer.trim()) {
      try {
        const data = JSON.parse(buffer);
        const candidate = data.candidates?.[0];

        if (candidate?.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.text) {
              fullText += part.text;
              onChunk(part.text);
            }
          }
        }
      } catch (e) {
        console.warn('[Google Stream] Final buffer parse failed:', {
          buffer: buffer.slice(0, 100),
          error: e instanceof Error ? e.message : 'Unknown',
        });
      }
    }
  } finally {
    reader.releaseLock();
  }

  return ensureRenderCall(stripCodeFences(fullText));
}

export async function streamGoogle(
  prompt: string,
  apiKey: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  return withModelFallback(GOOGLE_MODELS, (model) =>
    streamGoogleModel(prompt, apiKey, model, onChunk)
  );
}
