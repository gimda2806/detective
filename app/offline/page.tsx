import { listCases } from '../game';
import { OfflineCaseLibrary } from './OfflineCaseLibrary';

// Entry point for the no-API game. The AI game keeps / and /case/<id>; this
// tree is /offline and /offline/<id>, sharing only the case data and the save
// layer underneath.
export default async function OfflineHome() {
  const cases = await listCases();

  return (
    <main className="case-library">
      <OfflineCaseLibrary cases={cases} />
    </main>
  );
}
