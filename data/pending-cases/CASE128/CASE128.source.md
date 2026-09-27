# CASE128 — 멎은 박자
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

아마추어 혼성 합창단 '한소리'가 매년 여름 여는 1박 2일 야유회. 계곡을 낀 개인 소유 펜션 '초록물결'을 통째로 빌려, 둘째 날 저녁 뒤풀이 공연을 마친 참이었다.

## 톤

밤이 깊어가는 계곡, 방금까지 이어지던 박수와 웃음소리가 뚝 끊긴 자리. 탐정과 한지우는 젖은 풀숲을 헤치며 그 정적 속으로 들어선다.

## 탐정의 진입

- 경로: `accompanying_someone`

탐정과 한지우는 이번 시즌 새로 합류한 임도경의 개인적인 동행으로 야유회에 따라와 있었다. 공연이 끝난 뒤 마당에서 이야기를 나누던 중 계곡 쪽에서 다급한 외침을 듣는다.

## 진실

**진범**: 하민준 (CH02)
**공범**: 없음

### 동기

하민준은 오채린과 1년 가까이 은밀히 만나 왔으나, 최근 그녀의 연습 일정과 파트 배정까지 사사건건 정하려 드는 자신의 태도에 지쳐 있던 오채린이 그날 밤 관계를 완전히 끝내고 다른 합창단으로 옮기겠다고 통보하자 격분해 범행에 이르렀다.

### 수법

계곡 데크에서 실랑이가 격해지자 하민준이 오채린을 밀쳤고, 오채린이 젖은 돌계단 모서리에 머리를 부딪히며 그대로 물속에 쓰러져 익사했다.

### 결정적 시각·장소

사건 당일 21시 45분경, 계곡 옆 야외 데크(L02)에서.

### 은폐

하민준은 쓰러진 오채린 옆에 떨어진 휴대전화를 집어 자신의 가방 속에 숨기고, 계단 위에 벗어 둔 그녀의 슬리퍼를 가지런히 정돈해 혼자 내려가다 미끄러진 것처럼 꾸몄다. 이어 자신의 젖은 옷을 세탁실 구석 수건 더미 밑에 숨기고 여벌 옷으로 갈아입어, 그 시각 데크 근처에 있었다는 흔적을 지웠다.

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