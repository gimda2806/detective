/**
 * 스프레드시트 위장 테마의 라벨 대체 테이블.
 *
 * 위장을 무너뜨리는 건 스타일이 아니라 텍스트다. 초록 리본 아래 시트 탭에
 * "증거"가 적혀 있고 A열에 "탐정"이 찍혀 있으면 아무리 격자를 그려도 한눈에
 * 게임 화면으로 읽힌다. CSS로는 바꿀 수 없는 자리라 여기서 갈아끼운다.
 *
 * 대응하는 일반 테마 라벨을 키로 쓰지 않고 각 자리의 고유 id를 키로 쓴다 —
 * "증거"처럼 여러 곳에 나오는 단어를 일괄 치환하면 엉뚱한 자리까지 바뀐다.
 */

/** 시트 탭. 사건 수첩의 탭 id와 1:1로 대응한다. */
export const SPREADSHEET_TAB_LABELS: Record<string, string> = {
  cards: '항목',
  testimony: '진술',
  people: '담당자',
  places: '위치',
  timeline: '일정',
  notes: '비고',
};

/**
 * 대화 A열의 화자 라벨. 사람 이름이 아니라 기록 종류로 읽히게 바꾼다 —
 * 업무용 시트에서 한 행이 누구 발언인지보다 어떤 성격의 줄인지가 먼저
 * 보이는 것과 같다.
 */
export const SPREADSHEET_SPEAKER_LABELS: Record<string, string> = {
  gm: '기록',
  detective: '질문',
  jiwoo: '참고',
  user: '입력',
};

export function spreadsheetTabLabel(tabId: string, fallback: string) {
  return SPREADSHEET_TAB_LABELS[tabId] || fallback;
}

export function spreadsheetSpeakerLabel(role: string, fallback: string) {
  return SPREADSHEET_SPEAKER_LABELS[role] || fallback;
}
