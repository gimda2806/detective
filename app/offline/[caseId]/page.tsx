import { DetectiveApp } from '../../DetectiveApp';
import { stateView } from '../../game';

// The no-API game. Same shell, same notebook, same case data as
// /case/<caseId> — but the GM is app/gm/offline-engine.ts, the player picks
// from actions Master actually authorises instead of typing free text, and
// the session is saved under its own row, so playing here never touches an
// AI session of the same case.
export default async function OfflineCasePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const initialData = await stateView(caseId, undefined, 'offline');

  return (
    <DetectiveApp caseId={caseId} initialData={initialData} variant="offline" />
  );
}
