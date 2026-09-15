# CASE087 — 혼합실이 삼킨 성분
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

환경안전 성분검사 갱신 심사를 사흘 앞둔 특수 도료 공장 '크로마텍'의 혼합·충전 작업동. 인증 시료 마지막 혼합 작업이 한창이던 늦은 밤, 수석 배합엔지니어 매한완이 혼합공정실 안에서 쓰러진 채 발견돼 병원으로 옮겨졌으나 사망이 확인된다.

## 톤

환경안전 검사를 사흘 앞둔 조급함과, 갇힌 듯한 공장 안에서 서로를 향한 의심이 스며드는 서늘함이 뒤섞인 분위기.

## 탐정의 진입

- 경로: `stranded_by_circumstance`

탐정은 폭우로 인근 도로가 통제되며 크로마텍 방문객 대기실에 발이 묶여 있던 참이었다.

## 진실

**진범**: 전국희 (CH03)
**공범**: 없음

### 동기

전국희는 유해물질 함유량이 기준치를 넘는 도료 시료를 검사 결과만 낮춰 통과시켜 온 사람이었다. 매한완이 배합기록과 실제 성분 비율 사이의 어긋남을 짚어내 본사 감사팀에 사흘 뒤 그대로 보고하겠다고 통보하자, 전국희는 검사 전에 그 보고를 막아설 방법을 찾아야 했다.

### 수법

다툰 직후 전국희는 인증 시료 배합통에 원래 함께 넣으면 안 되는 산화제 첨가물을 몰래 흘려 넣었다. 마지막 배합을 마무리하던 매한완이 평소처럼 배합통 뚜껑을 열자 두 물질이 뒤섞이며 유독가스가 순식간에 뿜어져 나왔고, 매한완은 이를 그대로 들이마신 채 그 자리에서 쓰러졌다.

### 결정적 시각·장소

D-1, 20:15, L03 혼합공정실에서 산화제 첨가물 투입 / D-1, 20:40, L03 혼합공정실에서 가스 흡입 및 쓰러짐 / D-1, 21:00, L03 혼합공정실에서 배합통 세척.

### 은폐

전국희는 사고 직후 배합통 잔여물을 씻어내고 환기팬을 미리 돌려 놓아, 유독가스가 발생했던 흔적 자체를 지우려 했다.

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