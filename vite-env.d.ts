// Minimal ambient declaration for Vite's import.meta.env, in the same spirit
// as vite-glob.d.ts next to it: just the one property this project reads,
// rather than pulling in all of vite/client's globals (which redeclare things
// like fetch/Request and would conflict with @cloudflare/workers-types).
//
// Only VITE_-prefixed names are exposed by Vite, and only the literal form
// `import.meta.env.VITE_…` is statically replaced at build time — so this has
// to stay a plain property access, not a cast or a computed lookup.
interface ImportMeta {
  readonly env?: {
    readonly VITE_DETECTIVE_SAVE_NS?: string;
  };
}
