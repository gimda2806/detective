// Node's --experimental-strip-types runs the app's TypeScript directly, but it
// will not guess an extension: `import './master-index'` inside app/gm/*.ts is
// how the bundler wants it written and how Node refuses to resolve it. This
// hook adds the `.ts` back so the offline checker can import the real engine
// instead of a copy that drifts.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (!specifier.startsWith('.')) throw error;
    const url = new URL(`${specifier}.ts`, context.parentURL);
    if (!existsSync(fileURLToPath(url))) throw error;

    return { format: 'module-typescript', shortCircuit: true, url: url.href };
  }
}
