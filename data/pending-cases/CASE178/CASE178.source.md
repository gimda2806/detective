# CASE178 — 별채에 감춘 유언
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

30년 만에 삼남매가 한자리에 모이는 아버지의 팔순잔치가 무르익은 산중 종가 고택 '소요당'. 잔치가 한창이던 늦은 오후, 둘째 아들이 사랑채 뒤편 별채 마루에 쓰러진 채 발견된다.

## 톤

가라앉은 가족극 톤. 한지우의 능청스러운 관찰이 무게를 덜어내되, 자백 순간의 무게는 지킨다.

## 탐정의 진입

- 경로: `personal_appointment`

탐정은 소요당 종손인 백정환 옹과 개인적인 약속이 있어 사랑채 쪽으로 찾아왔다가, 마침 열리고 있던 팔순잔치 한복판에 얼결에 자리하게 됐다.

## 진실

**진범**: 백선경 (CH01)
**공범**: 없음

### 동기

위독한 딸의 병간호비를 전적으로 책임져야 했던 백선경은, 아버지가 그날 저녁 종가 재산 대부분을 도경 앞으로 넘기는 유언장에 서명하기로 한 사실을 우연히 알고 절박하게 서명을 막으려 했다.

### 수법

백선경은 15시경 별채로 백도경을 조용히 불러내 유언장 얘기를 따지다 몸싸움이 붙었고, 문턱 옆에 놓여 있던 놋쇠 향로를 집어 그의 가슴을 가격했다. 갈비뼈가 부러지며 내출혈이 시작된 백도경은 그 자리에서 서서히 의식을 잃었다.

### 결정적 시각·장소

15시 10분경, 별채 마루.

### 은폐

백선경은 향로를 문턱 옆 원래 자리로 되돌려놓고, 저고리 소맷단에 묻은 핏자국을 곳간 세면장에서 씻어낸 뒤 태연히 손님들 사이로 돌아가 알리바이를 만들었다. 발견 소동이 벌어지자 가장 먼저 달려가 오열하는 모습으로 의심을 피했다.

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