// Minimal ambient declaration for Vite's import.meta.glob, scoped to just
// this one API rather than pulling in all of vite/client's globals (which
// also redeclare things like fetch/Request that could conflict with
// @cloudflare/workers-types). Matches Vite's actual glob signature closely
// enough for the eager, typed usage in app/game.ts.
interface ImportMeta {
  glob<T = unknown>(
    pattern: string,
    options: { eager: true },
  ): Record<string, T>;
}
