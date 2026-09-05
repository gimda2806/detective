import { listCases } from './game';
import { CaseLibrary } from './CaseLibrary';

export default async function Home() {
  const cases = await listCases();

  return (
    <main className="case-library">
      <CaseLibrary cases={cases} />
    </main>
  );
}
