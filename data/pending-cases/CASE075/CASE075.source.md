# CASE075 — 시약실이 삼킨 판독
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

임상검사기관 인증 갱신 심사를 사흘 앞둔 유전자검사 바이오텍 연구소 '헬릭스진'의 검사·분석동. 정기 인증 심사용 검체 재검사가 한창이던 늦은 밤, 수석 분석연구원 견국린이 시약보관실 안에서 의식을 잃은 채 발견돼 병원으로 옮겨졌으나 사망이 확인된다.

## 톤

인증 심사를 사흘 앞둔 조급함과, 연구 데이터에 대한 신뢰가 깨질 때의 서늘함이 겹치는 분위기.

## 탐정의 진입

- 경로: `curious_bystander`

탐정은 근처를 지나던 길에 헬릭스진 건물 앞으로 몰려드는 사람들을 보고 걸음을 멈췄다.

## 진실

**진범**: 고영온 (CH03)
**공범**: 없음

### 동기

고영온은 분석팀장으로서 판독이 애매한 검체 결과를 임상적으로 유리하게 다시 써 넘겨 온 이력이 있었다. 견국린이 원본 판독값과 보고서 사이의 불일치를 짚어내고, 사흘 뒤 인증심사위원에게 그대로 알리겠다고 통보하자 고영온은 갱신 심사 자체가 뒤집힐 위기에 몰렸다.

### 수법

고영온은 시약보관실 선반에서 평소 세척용으로 쓰는 중성 세척액병의 내용물을 강한 산화계 소독액으로 몰래 바꿔치기해 두었다. 견국린은 재검사를 위해 늦은 밤 홀로 시약보관실에 들어가 늘 쓰던 대로 세척액을 산성 고정액과 함께 섞었고, 좁은 방 안에서 순식간에 유독 가스가 퍼져 나왔다. 환기팬이 미처 따라잡지 못한 사이 견국린은 의식을 잃고 쓰러졌다.

### 결정적 시각·장소

D-2, 저녁, L03 시약보관실에서 세척액병 바꿔치기 / D-1, 22:10, L03 시약보관실에서 재검사 및 가스 흡입 / D-1, 22:40, L03 시약보관실에서 바뀐 병 회수.

### 은폐

고영온은 사고 직후 사람들이 몰려든 틈을 타 바뀐 세척액병을 원래 병으로 되돌려 놓고, 자신이 그날 시약보관실에 들어간 적이 없다고 둘러댔다.

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