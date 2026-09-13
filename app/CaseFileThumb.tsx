/**
 * 사건 파일 썸네일.
 *
 * 고정 요소(서류철 형태, 뒤에 삐져나온 종이, 붉은 봉인 띠)는 모든 사건이
 * 공유하고, case_id 해시로 탭 색과 봉인 도장 모양만 달라진다. 여기에 진행
 * 상태가 봉인 상태로 드러난다 — 미플레이는 띠가 온전하고, 진행 중이면 띠가
 * 끊어져 있고, 종료된 사건은 띠가 사라지고 도장 자국만 남는다.
 *
 * 색은 전부 globals.css의 값을 그대로 쓴다. 다크 모드 대응은 없다 —
 * 앱 자체가 라이트 고정이라 여기서만 반전시키면 페이지와 어긋난다.
 */

type SealState = 'sealed' | 'opened' | 'closed';

type CaseFileThumbProps = {
  caseId: string;
  /** 0~100. null이면 아직 플레이 기록이 없는 것으로 본다. */
  progress?: number | null;
  /** 사건종료가 확인된 사건. progress보다 우선한다. */
  complete?: boolean;
  width?: number;
  height?: number;
  className?: string;
};

/**
 * 탭 색 후보. 붉은 계열은 일부러 뺐다 — 봉인 띠가 이미 #9b3d28이라
 * 같은 계열 도장을 얹으면 띠 위에서 안 보인다. 앱 팔레트에서 빨강은
 * .reset-button / .error-line 같은 되돌릴 수 없는 동작 전용이기도 하다.
 */
const TAB_COLORS = [
  '#17645f', // --primary
  '#6d5721', // .detective-label
  '#4a5a5c',
  '#566b39',
  '#6b3f52',
  '#2f4a6b',
] as const;

const SEAL_SHAPES = ['disc', 'diamond', 'ring', 'octagon'] as const;

type SealShape = (typeof SEAL_SHAPES)[number];

const PAPER = '#fffdf8'; // --card
const BORDER = '#d8d0c2'; // --border
const BOARD = '#ece6da'; // --muted
const LINE = '#d8d0c2';
const BAND = '#9b3d28';

/**
 * 같은 사건이 언제나 같은 그림을 받아야 하므로 Math.random()이나 인덱스가
 * 아니라 문자열 해시를 쓴다. 목록 정렬이 바뀌어도, 사건이 추가돼도 기존
 * 사건의 썸네일은 그대로다.
 */
function hashCaseId(caseId: string) {
  let hash = 0;
  for (let index = 0; index < caseId.length; index += 1) {
    hash = (hash * 31 + caseId.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function resolveSealState(
  progress: number | null | undefined,
  complete: boolean | undefined,
): SealState {
  if (complete) return 'closed';
  if (typeof progress === 'number' && progress > 0) return 'opened';
  return 'sealed';
}

function Seal({
  shape,
  color,
  faded,
}: {
  shape: SealShape;
  color: string;
  faded?: boolean;
}) {
  const stroke = faded ? color : PAPER;
  const opacity = faded ? 0.75 : 1;

  if (shape === 'ring') {
    return (
      <g opacity={opacity}>
        <circle r={9} fill={color} stroke={stroke} />
        <circle r={4} fill={faded ? PAPER : BAND} />
      </g>
    );
  }

  if (shape === 'diamond') {
    return (
      <g opacity={opacity} transform="rotate(45)">
        <rect x={-6.5} y={-6.5} width={13} height={13} fill={color} stroke={stroke} />
      </g>
    );
  }

  if (shape === 'octagon') {
    return (
      <polygon
        opacity={opacity}
        points="9,0 6.4,6.4 0,9 -6.4,6.4 -9,0 -6.4,-6.4 0,-9 6.4,-6.4"
        fill={color}
        stroke={stroke}
      />
    );
  }

  return <circle r={9} fill={color} stroke={stroke} opacity={opacity} />;
}

export default function CaseFileThumb({
  caseId,
  progress = null,
  complete = false,
  width = 200,
  height = 133,
  className,
}: CaseFileThumbProps) {
  const hash = hashCaseId(caseId);
  const tab = TAB_COLORS[hash % TAB_COLORS.length];
  const shape = SEAL_SHAPES[Math.floor(hash / TAB_COLORS.length) % SEAL_SHAPES.length];
  const state = resolveSealState(progress, complete);

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 150 100"
      role="img"
      aria-label={
        state === 'closed'
          ? '종결된 사건 파일'
          : state === 'opened'
            ? '조사 중인 사건 파일'
            : '아직 열지 않은 사건 파일'
      }
    >
      <rect x={0} y={0} width={150} height={100} rx={8} fill={BOARD} stroke={BORDER} />

      {/* 종료된 사건은 안쪽 서류가 더 밖으로 빠져나온 상태로 둔다 */}
      <g transform={state === 'closed' ? 'rotate(-9 77 45)' : 'rotate(-4 77 49)'}>
        <rect
          x={state === 'closed' ? 42 : 40}
          y={state === 'closed' ? 16 : 20}
          width={74}
          height={58}
          rx={3}
          fill={PAPER}
          stroke={BORDER}
        />
      </g>
      <g transform="rotate(3 76 51)">
        <rect x={38} y={22} width={76} height={58} rx={3} fill={PAPER} stroke={BORDER} />
      </g>

      <rect x={34} y={17} width={34} height={14} rx={3} fill={tab} />
      <rect x={34} y={26} width={82} height={60} rx={4} fill={PAPER} stroke={BORDER} />

      <rect x={44} y={38} width={44} height={3.5} rx={2} fill={LINE} />
      <rect x={44} y={47} width={32} height={3.5} rx={2} fill={LINE} />
      <rect x={44} y={56} width={40} height={3.5} rx={2} fill={LINE} />
      {state !== 'closed' && <rect x={44} y={65} width={26} height={3.5} rx={2} fill={LINE} />}

      {state === 'sealed' && <rect x={94} y={20} width={9} height={72} fill={BAND} />}

      {/* 진행 중: 띠가 도장 자리에서 끊어지고 찢긴 끝이 남는다 */}
      {state === 'opened' && (
        <>
          <path d="M94 20 L103 20 L103 44 L98 48 L94 43 Z" fill={BAND} />
          <path d="M95 68 L102 64 L104 92 L95 92 Z" fill={BAND} />
        </>
      )}

      {state === 'closed' ? (
        <g transform="translate(92,68) rotate(-11)">
          <Seal shape={shape} color={tab} faded />
        </g>
      ) : (
        <g transform={`translate(98.5,56)${state === 'opened' ? ' rotate(-14)' : ''}`}>
          <Seal shape={shape} color={tab} />
        </g>
      )}
    </svg>
  );
}
