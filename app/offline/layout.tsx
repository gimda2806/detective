import type { ReactNode } from 'react';
import './offline.css';

// Loads the offline game's stylesheet once for both /offline routes. The
// import lives here, in a server component, rather than inside the two client
// components that need it: imported from a client component the bundler splits
// the CSS-only module into its own chunk and then emits a script reference to
// a JS file it never writes, which 404s on every page load.
export default function OfflineLayout({ children }: { children: ReactNode }) {
  return children;
}
