# CASE047 — 졸업앨범이 지운 밤
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

폐교를 앞두고 리모델링 공사가 한창인 옛 중학교 건물. 20주년 동창회 만찬이 열리는 밤, 행사를 준비하던 동창회 총무가 옥상으로 통하는 비상계단 아래에서 추락한 채 발견된다.

## 톤

20년 만의 재회가 주는 반가움과 그 이면의 오래된 죄책감이 뒤섞인 폐교의 밤.

## 탐정의 진입

- 경로: `onsite_recognized_and_asked`

탐정은 리모델링 공사 안전 점검 자문차 마침 건물 인근에 와 있다가, 옥상 쪽에서 들려온 비명 소리에 이끌려 다가간다. 소란 속에서 그를 알아본 동창회장이 다급히 손을 붙잡는다.

## 진실

**진범**: 매서준 (CH02)
**공범**: 없음

### 동기

매서준은 15년 전 학교 축제 날 밤, 지호은을 이 옥상 비상계단에서 밀어 추락시켰다. 그 일은 '술에 취해 혼자 넘어진 사고'로 덮였고, 매서준은 이후 방송사 앵커를 거쳐 지역구 시의원 예비후보로 성장했다. 그런데 석다인이 20주년 기념 영상을 준비하던 중 당시 현장이 찍힌 옛 테이프를 발견해 진실을 밝히려 했고, 이는 출마 선언을 앞둔 매서준의 경력 전체를 무너뜨릴 수 있는 사실이었다.

### 수법

매서준은 20:05경 방송실에서 다인이 영상 파일 끝에 옛 테이프를 몰래 이어붙인 것을 발견하고, 20:15경 다인을 옥상 비상계단으로 불러내 영상을 지우라고 요구하다 20:25경 몸싸움 끝에 그를 난간 너머로 밀어 추락시켰다.

### 결정적 시각·장소

20:05, L04 방송실에서 증거 영상 발견 / 20:15~20:25, L02 옥상 비상계단에서 다인을 밀어 추락시킴.

### 은폐

매서준은 태연히 만찬장으로 돌아와 아무 일 없었다는 듯 행동했고, 다인의 죽음이 리모델링 공사가 덜 끝난 옥상의 안전사고인 것처럼 보이길 바랐다.

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