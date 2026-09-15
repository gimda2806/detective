# CASE151 — 서명 없는 이름
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

생방송 입양 상봉 특집 촬영을 앞둔 가족찾기 지원센터 '실뿌리센터'. 오래된 입양 기록을 관리해 온 기록관리팀장이 기록보관실 이동식 서가 옆에서 쓰러진 채 발견돼 병원으로 옮겨졌으나 사망이 확인된다.

## 톤

가족을 찾는 이들의 절박함과, 그걸 이용한 어른들의 오래된 거짓이 부딪히는 무거운 분위기.

## 탐정의 진입

- 경로: `service_call`

탐정은 오늘 저녁 생방송 상봉 특집 촬영에 맞춰 센터가 새로 들이는 출입통제 패널 설치를 의뢰받아, 오전부터 설비실에서 배선 작업을 하고 있었다.

## 진실

**진범**: 노형탁 (CH01)
**공범**: 없음

### 동기

27년 전 미성년이던 생모의 서명을 대신 써서 입양 동의서를 완성시킨 사실이, 오늘 저녁 생방송 상봉을 앞두고 드러날 위기에 처했다.

### 수법

기록보관실에서 동의서 원본을 두고 실랑이를 벌이다 차윤경을 밀쳤고, 뒷걸음질 치던 차윤경이 이동식 서가 모서리에 뒤통수를 부딪혀 쓰러졌다.

### 결정적 시각·장소

14시 18분~20분, L02 기록보관실에서 실랑이와 충돌 발생.

### 은폐

쓰러진 차윤경이 반응이 없다는 걸 확인하고도 신고하지 않은 채, 흐트러진 상자를 정리하고 스텝스툴을 옮겨 놓아 혼자 정리하다 실족한 것처럼 꾸몄다. 이후 위조 사실이 남은 원본 서명 페이지를 문서파쇄기에 넣어 없앴다.

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