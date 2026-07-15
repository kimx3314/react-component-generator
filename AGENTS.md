# AGENTS.md - React Component Generator

## Operational Commands

All development uses **bun** exclusively. Never use npm, yarn, or pnpm.

```bash
# Development: Start API server + Vite dev server (concurrent)
bun run dev

# Backend only: Watch-mode Bun server for testing backend changes
bun run server

# Build for production
bun run build

# Type checking
bun run build  # includes tsc -b

# Run tests (one-shot)
bun test

# Watch-mode testing
bun test:watch

# Linting
bun run lint

# Preview production build locally
bun run preview

# Dependencies
bun install       # Install all dependencies
```

## Golden Rules

**Immutable Rules (Never Compromise):**

1. **API Key Security:** Never hardcode API keys. Require `.env` file. Provide fallback UI input when `.env` is missing.
2. **AI Provider Fallback:** Implement graceful degradation when primary provider (Claude) fails. Gemini serves as automatic fallback. Always surface errors to user.
3. **React-Live Sandbox:** All generated code runs via react-live in an isolated sandbox. Validate generated JSX before execution to prevent injection.
4. **Bun Lock-In:** Backend MUST use Bun runtime (bun --watch, Bun.env, etc). No Node.js stdlib assumptions.
5. **Type Safety:** TypeScript strict mode enabled. No `any` types without explicit justification.
6. **ES Modules:** Project is `"type": "module"` (ESM). Always use `import/export`, never `require()`.

**Do's & Don'ts:**

- DO use `bun install` for dependency changes.
- DO test both AI providers (Claude → Gemini fallback path).
- DO validate and sanitize all user-generated code before react-live execution.
- DON'T modify `vite.config.ts` or `tsconfig.json` without considering impact on both server and client.
- DON'T add third-party AI SDKs without evaluating fallback implications.
- DON'T bypass type checking; fix root cause instead.

## Project Context

A real-time React component generator that accepts prompts and renders interactive previews via react-live. Supports multi-AI-provider orchestration (Anthropic Claude with Gemini fallback) and live code editing.

**Tech Stack:**
- Frontend: React 19, TypeScript, Vite, react-live
- Backend: Bun (API proxy for AI providers)
- AI: Anthropic Claude, Google Gemini
- Testing: Vitest, React Testing Library
- Linting: ESLint

## Standards & References

**Commit Message Format:**
```
<type>: <description>

<body (optional)>

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`

**Code Conventions:**
- Use TypeScript for all source files (.ts, .tsx).
- Component names are PascalCase; utility/hook names are camelCase.
- No magic numbers; extract to named constants.
- Test files colocate with source: `Component.test.tsx` alongside `Component.tsx`.

**Maintenance Policy:**
If rules diverge from code, propose updates to this file. Keep it current to maximize agent consistency.

## Context Map

- **[Backend / AI Provider Integration (server/)](./server/AGENTS.md)** — Bun server, AI API proxy, fallback orchestration.
- **[Frontend / React Components & Live Preview (src/components/)](./src/components/AGENTS.md)** — react-live sandbox, component rendering, user input handling.
