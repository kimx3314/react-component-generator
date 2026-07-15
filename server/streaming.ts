import { stripCodeFences, ensureRenderCall } from './generator';
import { withModelFallback } from './fallback';

const GOOGLE_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash'];

const SYSTEM_PROMPT = `You are a React component generator. Generate a single React component based on the user's description.

Rules:
- Use inline styles only (no CSS imports, no CSS modules)
- Do NOT use import statements — React is already available in scope as a global
- Define the component as a function, then call render(<ComponentName />) at the end
- Make the component visually appealing with proper styling
- Use React hooks if needed (e.g., React.useState, React.useEffect)
- The component must be completely self-contained
- Respond with ONLY the code block — no explanations, no markdown fences
- Use descriptive variable names and clean formatting
- For colors, prefer modern palettes (gradients, shadows, etc.)
- Ensure the component is interactive where appropriate (hover states, click handlers, etc.)
- Do NOT use TypeScript syntax — no type annotations, no interfaces, no generics, no "as" casts. Write plain JavaScript only.

Example output format:
const GradientButton = () => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      style={{
        background: hovered
          ? 'linear-gradient(135deg, #667eea, #764ba2)'
          : 'linear-gradient(135deg, #764ba2, #667eea)',
        color: 'white',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '16px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      Click me
    </button>
  );
};

render(<GradientButton />);`;

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
          } catch {
            // JSON 파싱 실패는 무시
          }
        }
      }

      buffer = lines[lines.length - 1];
    }

    // 남은 버퍼 처리
    if (buffer.trim()) {
      try {
        const data = JSON.parse(buffer.slice(6));
        if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
          const text = data.delta.text;
          fullText += text;
          onChunk(text);
        }
      } catch {
        // 무시
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
        } catch {
          // JSON 파싱 실패는 무시
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
      } catch {
        // 무시
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
