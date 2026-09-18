import { CaseLocked } from '../../CaseLocked';
import { DetectiveApp } from '../../DetectiveApp';
import { caseGateFor, stateView } from '../../game';

export default async function CasePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  // 막이 안 열린 사건은 주소로 쳐도 안 열린다(app/gm/case-gate.ts).
  const gate = await caseGateFor(caseId, 'ai');
  if (gate.locked) {
    return (
      <CaseLocked
        caseId={caseId}
        solved={gate.solved}
        unlocksAt={gate.unlocks_at ?? 0}
        variant="ai"
      />
    );
  }
  const initialData = await stateView(caseId);

  return <DetectiveApp caseId={caseId} initialData={initialData} />;
}
