# CASE170 — 커튼콜 전에 멈춘 숨
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

정기공연 개막을 하루 앞둔 시립발레단. 마지막 기술 리허설이 한창이던 밤, 은퇴를 앞둔 예술감독이 의상 아카이브에서 쓰러진 채 발견된다.

## 톤

무대 뒤편 특유의 긴장과 예술적 자존심이 부딪히는 분위기. 한지우는 예리한 관찰로 허를 찌르면서도, 탐정과의 대화에서는 능청스러운 티키타카를 잃지 않는다.

## 탐정의 진입

- 경로: `personal_stake`

탐정은 이 발레단의 개인 후원인 중 한 명으로, 최근 후원금 집행 내역이 석연치 않다는 이야기를 듣고 마지막 리허설을 직접 참관하러 와 있었다.

## 진실

**진범**: 노윤채 (CH01)
**공범**: 없음

### 동기

노윤채는 은퇴를 앞둔 예술감독 설도담의 후임 자리를 노리고, 재단 정기총회에 제출할 표결 위임장 중 일부를 조작해 자신에게 유리한 표를 미리 확보해 두었다. 그런데 설도담이 위임장 초안의 서명이 어긋난 것을 발견하고 이사장에게 알리려 하자, 승계 계획이 무산될 위기에 처했다.

### 수법

노윤채는 의상 아카이브 격발함의 사전경보 사이렌 배터리를 미리 빼 두고, 설도담이 아카이브에서 보존 목록을 대조하는 사이 수동 격발 레버를 당겨 불활성기체 소화가스를 방출시켰다. 경보음 없이 산소 농도가 급격히 낮아지며 설도담은 미처 빠져나오지 못하고 질식했다.

### 결정적 시각·장소

13:40 L05 단장실에서 위임장 서명을 대신 써넣음 / 16:20 L03 의상 아카이브에서 경보 사이렌 배터리를 빼냄 / 19:40 L03에서 격발 레버를 당김.

### 은폐

노윤채는 소화설비가 오래돼 오작동한 사고라고 둘러대고, 위임장 원본은 자신이 다시 정리해 제출하겠다며 미리 회수해 은닉하려 한다.

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