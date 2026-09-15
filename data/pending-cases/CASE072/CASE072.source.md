# CASE072 — 연습실이 삼킨 점수
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

데뷔조 최종 오디션 발표를 이틀 앞둔 연습생 트레이닝센터 '스타포지엔터'의 안무연습·공연 준비동. 최종 오디션 리허설이 한창이던 늦은 밤, 수석 트레이닝코치 반예원이 안무연습실 무대 위에서 쓰러진 채 발견돼 병원으로 옮겨졌으나 사망이 확인된다.

## 톤

데뷔조 발표를 이틀 앞두고 팽팽하던 연습실이, 무대 사고 하나로 순식간에 얼어붙는 분위기.

## 탐정의 진입

- 경로: `employee_or_staff`

탐정은 촬영 보조 스태프로 스타포지엔터에서 임시로 일하던 중, 안무연습실 무대 쪽에서 들린 요란한 소리에 하던 일을 멈췄다.

## 진실

**진범**: 공승윤 (CH03)
**공범**: 없음

### 동기

공승윤은 특정 연습생의 오디션 점수를 실제보다 높여 채점표를 조작해 왔다. 반예원이 원본 채점표와 발표된 점수가 어긋난다는 것을 확인하고 이사회에 그대로 보고하겠다고 나서자, 데뷔조 발표를 이틀 앞두고 공승윤은 그 사실이 새어나가는 것을 막아야만 했다.

### 수법

공승윤은 리허설 시작 전 무대 위 조명 트러스 고정 클램프 하나를 몰래 풀어 두었다. 반예원이 마지막 동선을 확인하려 무대 중앙에 서는 순간 트러스가 그대로 떨어져 내렸고, 미처 피하지 못한 그는 그 자리에서 쓰러졌다. 리허설 준비로 어수선하던 무대는 한동안 그 사실을 알아채지 못했고, 반예원은 병원으로 옮겨졌지만 결국 숨을 거뒀다.

### 결정적 시각·장소

D-1, 21:05, L03 안무연습실에서 클램프 이완 / D-1, 21:35, L03 안무연습실에서 낙하 사고 / D-1, 21:50, L03 안무연습실에서 클램프 재조임.

### 은폐

공승윤은 구급대가 도착하기 전 무대 위로 올라가 풀어 뒀던 클램프를 서둘러 다시 조여, 트러스가 저절로 떨어졌다고 여기게끔 만들려 했다.

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