# CASE143 — 뒤주가 가둔 새벽
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

종중 시제(연례 묘사)를 하루 앞둔 종가 소유 고택 겸 재실 '운초당(雲草堂)'. 오랫동안 발길이 끊겼던 방계 후손이 선대의 유언장 원본을 들고 나타나 상속 분쟁이 불거진 가운데, 다음 날 아침 문중 재산 관리를 도맡아 온 종손이 재실 뒤편 곳간의 대형 뒤주 안에 갇힌 채 숨진 상태로 발견된다.

## 톤

전통 가문의 격식과 뿌리 깊은 갈등이 무거운 톤으로 깔리지만, 탐정과 한지우의 가벼운 티키타카가 종종 숨통을 틔우는 잔잔한 드라마 톤.

## 탐정의 진입

- 경로: `accompanying_someone`

탐정은 이번 시제에 초대받은 당사자가 아니다. 대학 시절 룸메이트였던 오도경이 이 집안 셋째 며느리로 시제 준비를 돕겠다며 나서자, 그녀를 따라나섰다가 고택에 발이 묶였다.

## 진실

**진범**: 진태섭 (CH02)
**공범**: 없음

### 동기

진태섭은 3년간 문중 소유 임야 매각대금 중 일부를 개인적으로 빼돌려 왔다. 최원상이 정산 장부를 대조하다 차액을 발견하고 내일 총회에서 이를 공개하겠다고 하자, 진태섭은 자신의 지위와 형사처벌까지 걸린 상황에 몰렸다.

### 수법

진태섭은 최원상에게 총회 전까지 장부 얘기를 덮어달라고 부탁했다가 거절당하자 곳간까지 쫓아가 다시 언쟁을 벌였다. 몸싸움 끝에 삽자루로 최원상을 가격해 실신시킨 뒤, 통풍구가 막힌 대형 뒤주 안에 넣고 뚜껑을 닫아 질식사에 이르게 했다. 이후 서류함에서 매각 계약서 원본을 챙겨 달아났다.

### 결정적 시각·장소

21시 55분, L04 곳간에서 언쟁 재발 / 22시, L04에서 삽자루로 가격 / 22시 10분, L04 대형 뒤주에 감금.

### 은폐

진태섭은 '최원상 어르신이 밤에 곳간에서 발을 헛디뎌 사고를 당한 것 같다'고 주장하며, 회수한 매각 계약서 원본을 없앨 기회를 노린다.

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