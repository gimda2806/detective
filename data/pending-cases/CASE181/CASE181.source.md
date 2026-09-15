# CASE181 — 조종줄이 끊어진 밤
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

3대째 명맥을 이어온 전통 인형극단 '꼭두패'의 연습장 겸 소극장. 은퇴한 초대 단장의 칠순을 맞아 옛 단원들이 오랜만에 모여 즉흥적으로 마련한 비공식 축하 공연이 한창이던 밤, 조종대(操縦臺) 사다리 아래에서 수석 조종사가 쓰러진 채 발견된다.

## 톤

잔잔한 재회극 톤. 한지우의 능청스러운 관찰이 무게를 덜어내되, 자백 순간의 무게는 지킨다.

## 탐정의 진입

- 경로: `returning_former_affiliate`

탐정은 어린 시절 잠깐 이 극단에서 인형 조종을 배운 인연으로, 은퇴한 초대 단장의 칠순 축하 자리에 사적으로 초대받아 와 있었다.

## 진실

**진범**: 고재훈 (CH01)
**공범**: 없음

### 동기

20년 전 함께 개발한 이중 조종줄 기법을 장은규가 자신의 단독 창작인 것처럼 알려 조종대의 자리를 독차지하면서, 고재훈은 극단에서 밀려나듯 떠나야 했다. 이번 칠순 축하 공연에서 장은규를 '기법 창시자'로 공로패에 영구히 새겨 기리려는 계획을 우연히 알게 되자, 고재훈은 자신의 몫이 완전히 지워진다는 절박함에 사로잡혔다.

### 수법

고재훈은 저녁 공연 중간 조종대에 올라 장은규에게 공로패 시안을 들이밀며 이중 조종줄 기법이 원래 누구의 것이었는지 따졌다. 언성이 높아지며 몸싸움이 벌어졌고, 고재훈이 무의식적으로 장은규를 밀치자 그는 균형을 잃고 난간 밖으로 추락해 바닥에 부딪히며 경추가 골절돼 그 자리에서 즉사했다.

### 결정적 시각·장소

저녁 7시 45분경, 조종대(操縦臺) 위 좁은 발판.

### 은폐

고재훈은 난간 지지 볼트를 몰래 풀어 노후 파손처럼 보이게 만들고, 바닥에 떨어져 있던 조종봉 하나를 장은규의 발치 쪽으로 옮겨 발이 걸려 넘어진 사고처럼 꾸민 뒤, 태연히 객석 뒤편으로 돌아와 박수를 치며 관객들 사이에 섞여들었다.

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