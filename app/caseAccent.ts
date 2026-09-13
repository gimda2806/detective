/**
 * 사건별 색과 도장 모양을 정하는 단일 출처.
 *
 * 헤더(--case-accent)와 목록 썸네일(CaseFileThumb)이 같은 테이블을 써야
 * 목록에서 본 파일 색이 헤더로 그대로 이어진다. 한쪽에만 색을 추가하는
 * 사고를 막으려고 여기 한 곳에 모아둔다.
 */

import type { CSSProperties } from 'react';

/**
 * 붉은 계열은 일부러 없다. 봉인 띠가 #9b3d28 이라 같은 계열 도장은 띠
 * 위에서 보이지 않고, 앱 팔레트에서 빨강은 .reset-button / .error-line
 * 같은 되돌릴 수 없는 동작 전용이기도 하다.
 */
export const CASE_ACCENTS = [
  '#17645f', // --primary
  '#6d5721', // .detective-label
  '#4a5a5c',
  '#566b39',
  '#6b3f52',
  '#2f4a6b',
] as const;

export const SEAL_SHAPES = ['disc', 'diamond', 'ring', 'octagon'] as const;

export type SealShape = (typeof SEAL_SHAPES)[number];

/**
 * 같은 사건은 언제나 같은 색을 받아야 하므로 인덱스나 난수가 아니라
 * 문자열 해시를 쓴다. 목록 정렬이 바뀌어도, 사건이 추가돼도 기존 사건의
 * 색은 그대로다.
 */
export function hashCaseId(caseId: string) {
  let hash = 0;
  for (let index = 0; index < caseId.length; index += 1) {
    hash = (hash * 31 + caseId.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

export function caseAccent(caseId: string) {
  return CASE_ACCENTS[hashCaseId(caseId) % CASE_ACCENTS.length];
}

/** 색과 같은 해시에서 뽑되 자리를 달리해, 색이 같아도 도장이 겹치지 않게 한다. */
export function caseSealShape(caseId: string): SealShape {
  const offset = Math.floor(hashCaseId(caseId) / CASE_ACCENTS.length);
  return SEAL_SHAPES[offset % SEAL_SHAPES.length];
}

/** 헤더에 넘길 CSS 변수 묶음. style 속성에 그대로 펼쳐 쓴다. */
export function caseHeaderStyle(caseId: string, progressPercent: number) {
  return {
    '--case-accent': caseAccent(caseId),
    '--case-progress': `${Math.max(0, Math.min(100, progressPercent))}%`,
  } as CSSProperties;
}
