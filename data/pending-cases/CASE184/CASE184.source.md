# CASE184 — 조합대에 남은 침묵
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

번화가 뒷골목의 오래된 단골들만 아는 향수 공방 '온후(蘊薰)'. 정기 휴무일 오후, 조합실에 홀로 남아 있던 대표 조향사가 조합대 옆에 쓰러진 채 발견돼 병원으로 옮겨졌으나 사망이 확인된다.

## 톤

차분한 오후의 정적이 서서히 무너지는 톤. 한지우의 능청스러운 관찰이 무게를 살짝 덜어내지만, 자백의 순간만큼은 무겁게 다룬다.

## 탐정의 진입

- 경로: `meal_or_rest`

탐정과 한지우가 향수 공방 '온후' 옆 티하우스에서 오후 휴식을 취하던 중, 골목 안쪽에서 터진 소란에 이끌려 공방 마당까지 발걸음을 옮긴다.

## 진실

**진범**: 여은담 (CH01)
**공범**: 없음

### 동기

12년 전 화재 사고의 실제 원인이 하윤강 자신에게 있었음에도, 당시 수석 조향사였던 아버지 여목현이 책임을 뒤집어쓰고 쫓겨났다는 사실을 알게 된 여은담은 아버지의 누명을 되돌리고자 신분을 숨기고 공방에 들어와 진실을 따져 물었다.

### 수법

여은담은 오늘 13시 25분경 조합실에서 하윤강과 몸싸움을 벌이다 그가 조합대 모서리 구리 장식에 머리를 부딪히게 만들었다. 하윤강은 그 자리에서 뇌출혈로 목숨을 잃었다.

### 결정적 시각·장소

오늘 13시 20분~1시 40분경, 조합실 조합대 주변.

### 은폐

여은담은 넘어진 저울대와 의자를 사고처럼 보이도록 다시 흐트러뜨려 놓고, 노트를 앞치마 속에 감춘 뒤 태연히 원료창고로 돌아가 재고 정리를 계속했다.

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