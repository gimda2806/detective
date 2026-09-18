import { CaseLocked } from '../../CaseLocked';
import { caseGateFor, stateView } from '../../game';
import { OfflineDetectiveApp } from '../OfflineDetectiveApp';

// The no-API game. Same case data and same shell as /case/<caseId>, but the
// GM is app/gm/offline-engine.ts, the player picks from actions Master
// actually authorises instead of typing free text, and the session lives in
// its own save row — so playing here never touches an AI session of the same
// case, and this route needs no OPENAI_API_KEY at all.
export default async function OfflineCasePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  // 막이 안 열린 사건은 주소로 쳐도 안 열린다(app/gm/case-gate.ts).
  const gate = await caseGateFor(caseId, 'offline');
  if (gate.locked) {
    return (
      <CaseLocked
        caseId={caseId}
        solved={gate.solved}
        unlocksAt={gate.unlocks_at ?? 0}
        variant="offline"
      />
    );
  }
  const initialData = await stateView(caseId, undefined, 'offline');

  return <OfflineDetectiveApp caseId={caseId} initialData={initialData} />;
}
