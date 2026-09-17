# CASE134 — 밀봉되지 못한 이름
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

생명보험사와의 상조 결합상품 독점계약 발표를 사흘 앞둔 상조회사 부속 장례식장 '온유회관'. 발인을 앞둔 이른 새벽, 하관 준비실에서 수석 장례지도사가 유압식 관봉인기에 끼인 채 숨을 거둔 상태로 발견된다.

## 톤

차분하고 씁쓸한 상실감이 깔린 장례식장 특유의 정적 속에서도, 탐정과 한지우의 티키타카로 무거움에 완전히 잠식되지 않는 톤.

## 탐정의 진입

- 경로: `invited_by_acquaintance`

탐정은 오래전 자신에게 검도를 가르쳤던 사범의 발인에 조문객으로 참석했다가, 같은 시각 다른 빈소 쪽에서 갑작스러운 소란이 이는 것과 마주친다.

## 진실

**진범**: 안현서 (CH02)
**공범**: 없음

### 동기

안현서는 몇 년째 유골함 발주 단가를 이중 장부로 조작해 차액을 개인적으로 챙겨왔고, 이번 생명보험사와의 독점계약을 앞두고는 실적 보고서 수치까지 부풀렸다. 문수완이 유골함 사양 불일치를 발견해 청구 내역을 대조한 뒤 추궁하며 실사단에 알리겠다고 하자, 계약과 그동안의 편취 사실이 한꺼번에 드러날 것을 두려워했다.

### 수법

안현서는 사건 전날 밤 하관 준비실에 몰래 들어가 관봉인기의 안전 인터록 배선을 분리하고 정비 기록부를 조작했다. 이후 문수완에게 새벽 발인 전 혼자 관봉인 상태를 확인해 달라는 문자를 보내, 그가 무력화된 기계 앞에서 홀로 작업하다 눌려 숨지게 만들었다.

### 결정적 시각·장소

전날 23:00, 하관 준비실(L02)에서 안전 인터록 배선 분리 / 당일 04:10~04:12, 같은 장소에서 문수완 사망.

### 은폐

안현서는 정비 기록부에 정기 점검이 정상적으로 끝난 것으로 거짓 기재했고, 사고 이후에도 단순 오작동 사고인 것처럼 행동하며 이중 장부의 존재를 숨겼다.

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