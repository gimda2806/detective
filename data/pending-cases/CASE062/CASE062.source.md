# CASE062 — 분류기가 삼킨 오배송
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

대형 화주 계약 갱신 실사를 사흘 앞둔 이커머스 풀필먼트 물류센터 '스피드박스'의 자동분류 작업동. 야간 피크 물량 처리 작업이 한창이던 늦은 밤, 수석 물류품질담당자 제갈현영이 자동분류 라인 옆에서 쓰러진 채 발견돼 병원으로 옮겨졌으나 사망이 확인된다.

## 톤

화주사 계약 갱신 실사를 사흘 앞두고 팽팽하던 야간 물류센터가, 사고 하나로 순식간에 얼어붙는 분위기.

## 탐정의 진입

- 경로: `meal_or_rest`

탐정은 스피드박스 근처 식당에서 늦은 끼니를 해결하고 나오다 소란을 목격했다.

## 진실

**진범**: 한범인 (CH03)
**공범**: 없음

### 동기

한범인은 야간 오배송 건수를 실제보다 낮게 조작해 본사 감사팀 보고서를 꾸며 왔다. 그 사실을 제갈현영이 오배송 대사 기록에서 짚어내 본사 감사팀에 직접 제출하겠다고 통보하자, 사흘 앞으로 다가온 화주사 계약 갱신 실사 전에 손을 써야 하는 처지에 몰렸다.

### 수법

한범인은 야간 피크 물량이 한창이던 자동분류 라인 옆에서 다시 제갈현영과 마주쳤고, 언쟁 끝에 순간적으로 그를 떠밀었다. 제갈현영은 균형을 잃고 컨베이어 하부 롤러 프레임에 부딪히며 쓰러졌다. 한범인은 그 자리를 벗어났다가 얼마 뒤 되돌아와, 넘어지며 흩어진 상자들과 바닥의 흔적을 정리해 두었다. 제갈현영은 쓰러진 채 발견돼 병원으로 옮겨졌으나 끝내 사망했다.

### 결정적 시각·장소

D-1, 21:00, L03 자동분류 라인에서 1차 언쟁 / D-1, 21:40, L03 자동분류 라인에서 몸싸움 및 낙상 / D-1, 22:00, L03 자동분류 라인에서 현장 정리.

### 은폐

한범인은 '순찰하다 발견했을 뿐'이라며 사고 직전 그 자리에 있었다는 사실 자체를 부인했다.

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