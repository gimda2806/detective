import { listCases } from './game';
import { CaseGenerator } from './CaseGenerator';
import { CaseLibrary } from './CaseLibrary';
import { MasterUpload } from './MasterUpload';

export default async function Home() {
  const cases = await listCases();

  return (
    <main className="case-library">
      <CaseLibrary cases={cases} />
      <CaseGenerator />
      <MasterUpload />
    </main>
  );
}
