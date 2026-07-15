import { useState, useCallback, useEffect, useRef } from 'react';
import type { GeneratedComponent, Provider } from '../types';

interface StreamEvent {
  type: 'chunk' | 'done' | 'error';
  text?: string;
  code?: string;
  message?: string;
}

interface UseComponentGeneratorReturn {
  components: GeneratedComponent[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingCode: string;
  error: string | null;
  generate: (prompt: string, apiKey: string | undefined, provider: Provider) => Promise<void>;
  streamGenerate: (prompt: string, apiKey: string | undefined, provider: Provider) => Promise<void>;
  cancelStream: () => void;
  removeComponent: (id: string) => void;
  clearAll: () => void;
}

const STORAGE_KEY = 'rcg_components';
const MAX_COMPONENTS = 3;

function loadComponentsFromStorage(): GeneratedComponent[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored) as Array<{
      id: string;
      prompt: string;
      code: string;
      createdAt: string;
    }>;

    return parsed.map(c => ({
      ...c,
      createdAt: new Date(c.createdAt),
    }));
  } catch {
    return [];
  }
}

function saveComponentsToStorage(components: GeneratedComponent[]): void {
  try {
    const toStore = components.slice(0, MAX_COMPONENTS).map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    // localStorage full or unavailable, silently fail
  }
}

export function useComponentGenerator(): UseComponentGeneratorReturn {
  const [components, setComponents] = useState<GeneratedComponent[]>(() => loadComponentsFromStorage());
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingCode, setStreamingCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (components.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      saveComponentsToStorage(components);
    }
  }, [components]);

  const generate = useCallback(async (prompt: string, apiKey: string | undefined, provider: Provider) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...(apiKey && { apiKey }), provider }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate component');
      }

      const newComponent: GeneratedComponent = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        prompt,
        code: data.code,
        createdAt: new Date(),
      };

      setComponents((prev) => [newComponent, ...prev]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const streamGenerate = useCallback(
    async (prompt: string, apiKey: string | undefined, provider: Provider) => {
      // 이전 요청 취소
      abortControllerRef.current?.abort();

      setIsStreaming(true);
      setStreamingCode('');
      setError(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await fetch('/api/generate-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, ...(apiKey && { apiKey }), provider }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to stream component');
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('Response body not readable');

        const decoder = new TextDecoder();
        let buffer = '';
        let fullCode = '';

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
                const event: StreamEvent = JSON.parse(line);

                if (event.type === 'chunk' && event.text) {
                  setStreamingCode((prev) => prev + event.text);
                } else if (event.type === 'done' && event.code) {
                  fullCode = event.code;
                  const newComponent: GeneratedComponent = {
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    prompt,
                    code: fullCode,
                    createdAt: new Date(),
                  };
                  setComponents((prev) => [newComponent, ...prev]);
                } else if (event.type === 'error') {
                  throw new Error(event.message || 'Streaming error');
                }
              } catch (parseErr) {
                // JSON 파싱 실패는 무시
              }
            }

            buffer = lines[lines.length - 1];
          }
        } finally {
          reader.releaseLock();
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          const message = err instanceof Error ? err.message : 'Unknown error';
          setError(message);
        }
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        setIsStreaming(false);
      }
    },
    []
  );

  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
    setStreamingCode('');
  }, []);

  const removeComponent = useCallback((id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setComponents([]);
  }, []);

  return {
    components,
    isLoading,
    isStreaming,
    streamingCode,
    error,
    generate,
    streamGenerate,
    cancelStream,
    removeComponent,
    clearAll,
  };
}
