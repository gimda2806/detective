# CASE011 — 재단기가 삼킨 유언장
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

창립 50주년 기념 특별판 인쇄를 하루 앞둔 독립출판사 부속 인쇄공장. 야간 순찰을 돌던 기사가 지하 제본실 대형 재단기 앞에 쓰러진 편집장을 발견하고 신고한다.

## 톤

창립 기념일을 앞둔 들뜬 분위기와 경영권을 둘러싼 긴장이 뒤섞인 폐쇄적인 인쇄공장 분위기.

## 탐정의 진입

탐정은 경찰 강력계에 있는 옛 동료가 사고사로 서둘러 종결되려는 사건에 의문을 품고 도움을 요청해, 비공식적으로 인쇄공장에 들어온다.

## 진실

**진범**: 한도진 (CH02)
**공범**: 없음

### 동기

한도진은 창업주(외삼촌)의 사후 대표직을 물려받았지만, 실제로는 창업주가 남긴 육필 유언장에 회사 지분 전체를 초대 편집장의 딸이자 현재 편집장인 서은채에게 남긴다고 적혀 있었다. 한도진은 이 유언장을 숨기고 위조된 위임장으로 대표직을 차지해 왔는데, 창립 50주년 특별판을 준비하며 서고를 정리하던 서은채가 원본 유언장을 발견하고 다음 날 아침 고문 변호사에게 넘기겠다고 하자 이를 막기 위해 살해를 결심했다.

### 수법

한도진은 발간 전날 밤 제본실 대형 재단기의 안전 센서 스위치를 미리 꺼 두었고, 표지 재단 샘플을 함께 확인하자며 서은채를 제본실로 불러들여 재단기가 작동하는 동안 곁에서 물러서지 않고 사고를 방치했다.

### 결정적 시각·장소

21:30, L03 제본실에서 재단기 안전 센서 해제 / 22:15, L03 제본실에서 재단기 사고로 살해.

### 은폐

한도진은 사고 직후 안전 센서를 다시 켜 두어 야간 순찰자가 정상 작동으로 확인하게 만들고, 유언장 원본은 자신의 집무실 금고에 숨겨 둔다.

---

## 이 소스가 마스터의 어디로 가는가

| 소스 | 마스터 |
| --- | --- |
| 배경 | `locations[]`, `characters[].role`, `relationships[]` |
| 톤 | `opening_scene.narrative`, `ending_scene.narrative` |
| 탐정의 진입 | `opening_scene.narrative`, `opening_scene.detective_entry_time` |
| 동기 | `contradiction_stages`, `red_herrings`, `final_deduction.motive` |
| 수법 | `actual_timeline`, `evidence[]`, `final_deduction.method` |
| 결정적 시각·장소 | `actual_timeline`, `final_deduction.key_connection` |
| 은폐 | `actual_timeline`의 은폐 항목, `red_herrings`, `characters[].initial_claims` |
`full_truth.responsible_character_id`만은 마스터에 그대로 남는다 — 진범 판정,
타임라인 필터(`filterSafeTimelineFacts`), 대립 단계가 전부 그 값에 걸려 있다.