# src/components/AGENTS.md - Frontend / React Components & Live Preview

## Module Context

React 19 UI layer for component generator. Handles prompt input, API integration, and real-time rendering via react-live sandbox. All generated code executes in isolated sandbox; no external DOM access.

## Tech Stack & Constraints

- **Framework:** React 19 (latest stable), TypeScript
- **Build Tool:** Vite (dev server on port 5173)
- **Live Sandbox:** react-live (Scope isolation, no global state access)
- **Styling:** CSS Modules or inline styles (no CSS-in-JS required)
- **HTTP Client:** Native `fetch` only (no axios, superagent, etc.)
- **State Management:** React hooks (`useState`, `useReducer`); no external libraries

## Implementation Patterns

**File Structure:**
- `App.tsx` — Main layout, route to generator/preview
- `PromptInput.tsx` — Form input, API key fallback UI
- `CodeView.tsx` — Display generated code with syntax highlighting
- `LivePreview.tsx` — react-live Scope setup, component execution
- `ComponentCard.tsx` — Card wrapper (optional UI)
- `useComponentGenerator.ts` — Custom hook for API calls and state

**Pattern: Fallback API Key Input**

If `.env` missing, UI shows input field for API key. User enters key → send with request.

```typescript
// PromptInput.tsx
const [apiKey, setApiKey] = useState<string>(process.env.REACT_APP_API_KEY || "");
// If apiKey is empty string after .env read, show input field
```

**Pattern: react-live Scope Setup**

```typescript
// LivePreview.tsx
const scope = {
  React,
  useState,
  useEffect,
  // Add React hooks/standard library functions user code may need
};
<LiveProvider code={generatedCode} scope={scope}>
  <LivePreview />
</LiveProvider>
```

**HTTP Calls:**
- POST to `http://localhost:8000/api/generate` (or configured backend URL)
- Payload: `{ prompt: string, apiKey?: string }` (apiKey optional if .env set)
- Response: `{ code: string, provider: string }` or error

## Testing Strategy

Test files: `PromptInput.test.tsx`

Run: `bun test`, `bun test:watch`

**Coverage:**
- Input form: prompt text change, API key input (if needed), submit handler
- Error display: backend 500, malformed JSON, network timeout
- Live preview: valid JSX renders, invalid JSX shows error boundary

**Pattern:** React Testing Library (`render`, `screen.getByRole`, `userEvent`).

## Local Golden Rules

- **Sandbox Isolation:** Never pass user functions or closures into react-live scope. Scope is literal values only.
- **Error Boundaries:** Wrap `LivePreview` in an error boundary to catch runtime errors in generated code.
- **API Key Security:** Never log or display API key in plaintext. Use masked input for user-entered keys.
- **Validation:** Ensure returned code is JSX before passing to react-live. Reject if suspicious (script tags, fetch calls, etc.).
- **Refresh/Remount:** When user clicks "Refresh", re-create LiveProvider instance to force component remount.

**Do's & Don'ts:**
- DO use native `fetch` for API calls.
- DO validate backend response shape before rendering.
- DON'T pass function closures into react-live scope.
- DON'T log full API responses if they contain keys.
- DON'T use window global in generated code; it won't work in sandbox.
