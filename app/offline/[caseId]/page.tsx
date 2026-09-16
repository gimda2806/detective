import { stateView } from '../../game';
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
  const initialData = await stateView(caseId, undefined, 'offline');

  return <OfflineDetectiveApp caseId={caseId} initialData={initialData} />;
}
