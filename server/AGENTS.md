# server/AGENTS.md - Backend / AI Provider Integration

## Module Context

Bun-based backend that proxies requests to AI providers (Anthropic Claude → Google Gemini fallback). Implements generator logic, model selection, and error handling. No database; stateless request-response model.

## Tech Stack & Constraints

- **Runtime:** Bun (strict; `bun --watch` for development, `Bun.env` for config)
- **Protocol:** HTTP (Express-like pattern; built-in Bun HTTP server)
- **AI SDKs:** `@anthropic-ai/sdk`, `@google/generative-ai` (both required for fallback strategy)
- **No ORM/Database:** All logic is synchronous request handling
- **Environment:** Read secrets from `.env` via `Bun.env` or `process.env`

## Implementation Patterns

**File Structure:**
- `index.ts` — Server startup, route handlers, request/response middleware
- `generator.ts` — Core logic: parse prompt, call AI, return JSX
- `fallback.ts` — Provider fallback strategy (Claude → Gemini)

**Pattern: Provider Fallback**

When Claude call fails, auto-switch to Gemini. Both SDKs must be initialized and ready.

```typescript
// Pseudo-code
async function generateComponent(prompt: string) {
  try {
    return await callClaude(prompt);
  } catch (e) {
    console.warn("Claude failed, falling back to Gemini:", e.message);
    return await callGemini(prompt);
  }
}
```

**Environment Variables:**
- `ANTHROPIC_API_KEY` — Claude access
- `GOOGLE_API_KEY` — Gemini access
- Either key can be missing; fallback handles partial configs

**Error Handling:**
- If both providers fail, return structured error (status 500, JSON with provider names and messages)
- Never return partial JSX; validate generated code before returning
- Log provider-specific failures for debugging

## Testing Strategy

Test file: `generator.test.ts`, `fallback.test.ts`

Run: `bun test` (one-shot), `bun test:watch`

**Coverage:**
- `generator.ts`: Valid JSX generation, invalid prompt handling, API error parsing
- `fallback.ts`: Primary failure → fallback transition, both providers failing, missing API keys

**Pattern:** Vitest + mocking Anthropic and Google SDKs to avoid real API calls.

## Local Golden Rules

- **Always test both fallback paths** (Claude success, Claude fail → Gemini success, both fail).
- **API Key Validation:** Check `Bun.env` at startup; warn if keys missing.
- **JSX Validation:** Ensure generated code is syntactically valid before sending to client. Use a simple regex or parser.
- **No Hardcoded Defaults:** If API key missing, client must provide it; server returns 401 or 400 error.
- **Provider-Agnostic Responses:** Frontend doesn't know which provider executed; server abstracts that.

**Do's & Don'ts:**
- DO mock AI SDKs in tests; don't make live API calls.
- DO log provider selection and fallback events for observability.
- DON'T add streaming responses; keep request-response synchronous.
- DON'T cache generated components (stateless per request).
