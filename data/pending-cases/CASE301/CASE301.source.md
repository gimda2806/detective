# CASE301 — 울리지 않은 마지막 벨
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

우인시장 골목 안 3층 상가 건물 2층, 40년 가까이 자리를 지켜온 복싱체육관 '무학체육관'. 관장 방태성이 아버지에게 물려받아 20년 넘게 운영해 왔고, 현역 시절 함께 뛰던 옛 선수들이 지금은 트레이너나 관리인으로 남아 체육관을 지탱한다. 탐정은 대학 시절 반년 남짓 이곳에서 복싱을 배운 인연으로, 그때 맡겨 두고 찾아가지 않은 낡은 헤드기어가 문득 생각나 오랜만에 들렀다.

## 톤

낡은 체육관 특유의 땀과 가죽 냄새가 밴 담담한 톤. 오래된 사람들 사이의 침묵이 오히려 많은 것을 말해준다.

## 탐정의 진입

- 경로: `returning_former_affiliate`

대학 시절 반년 남짓 다니다 그만둔 체육관에, 그때 맡겨 두고 찾아가지 않은 낡은 헤드기어가 문득 생각나 오랜만에 들렀다.

## 진실

**진범**: 노환도 (CH01)
**공범**: 없음

### 동기

20년 전 국가대표 선발전에서 방태성이 판정에 관여해 노환도를 떨어뜨리고 후배를 밀어줬다는 사실을, 노환도는 최근 우연히 손에 넣은 계체 기록지 사본을 보고서야 확실히 알게 됐다. 그날 밤 방태성이 서준경에게 같은 방식의 판정 조작을 제안하는 것을 엿듣고, 20년 전의 배신이 눈앞에서 되풀이되는 것을 참지 못해 격분했다.

### 수법

폐관 후 사무실에서 그 일을 따지다 몸싸움이 붙었고, 노환도가 밀친 방태성이 철제 캐비닛 모서리에 옆구리를 부딪히며 넘어졌다. 그 자리에선 대수롭지 않아 보였지만, 부러진 갈비뼈가 서서히 흉강 안으로 피를 흘려보냈다.

### 결정적 시각·장소

사건 당일 21:40, 2층 관장 사무실(L03)

### 은폐

노환도가 흐트러진 캐비닛과 러그를 그대로 둔 채, 방태성과 다퉜다는 사실 자체를 아무에게도 말하지 않고 먼저 체육관을 나섰다.

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