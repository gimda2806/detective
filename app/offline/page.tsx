import { CaseLibrary } from '../CaseLibrary';
import { listCases } from '../game';

// Entry point for the no-API game: /offline and /offline/<id>, sharing the
// case data and the save layer with the AI game underneath but never its save
// rows. The list itself is the same component — the two differ only in which
// side of the GM switch is lit and where each row points, and listCases()
// already resolves both from the variant.
export default async function OfflineHome() {
  const cases = await listCases('offline');

  return (
    <main className="case-library">
      <CaseLibrary cases={cases} variant="offline" />
    </main>
  );
}
