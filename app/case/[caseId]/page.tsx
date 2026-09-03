import { DetectiveApp } from '../../DetectiveApp';
import { stateView } from '../../game';

export default async function CasePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const initialData = await stateView(caseId);

  return <DetectiveApp caseId={caseId} initialData={initialData} />;
}
