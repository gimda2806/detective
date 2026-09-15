# CASE113 — 식어버린 마지막 배치
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

국가대표 로스팅 챔피언십 예선 출전권을 건 사내 선발 커핑을 사흘 앞둔 독립 스페셜티 커피 로스터리 겸 커핑랩 '카일룸 로스터스'. 리허설 로스팅을 마친 늦은 밤, 유력 후보였던 수석 로스터가 로스팅룸 안에서 일산화탄소 중독으로 숨진 채 발견된다.

## 톤

챔피언십 출전권을 둘러싼 팽팽한 신경전과 갓 볶은 원두 향이 뒤섞인 로스터리.

## 탐정의 진입

- 경로: `personal_appointment`

탐정은 오랜 커핑 모임 지인인 백하람의 부탁으로, 사내 선발 커핑에 앞서 개인적으로 원두 배합을 품평해달라는 약속이 있어 카일룸 로스터스를 찾았다.

## 진실

**진범**: 소이한 (CH01)
**공범**: 없음

### 동기

소이한은 사흘 앞으로 다가온 사내 선발 커핑에서 나건우에게 밀려 챔피언십 예선 출전권을 놓칠 위기에 처하자, 그의 마지막 리허설 로스팅을 망쳐 실격시키려 했다.

### 수법

소이한은 당일 21시 35분경 로스팅룸 배기덕트 모터 퓨즈함의 퓨즈를 몰래 뽑아 환풍을 멈췄다. 21시 40분경 나건우가 이를 발견하고 언성을 높이며 맞서자 실랑이가 벌어졌고, 21시 50분경 소이한이 그를 떠밀어 넘어뜨렸다. 나건우는 넘어지며 정신을 잃었고, 이미 정체되기 시작한 일산화탄소를 미처 피하지 못한 채 중독사했다. 소이한은 이후 퓨즈를 다시 꽂아 두고 자리를 떴다.

### 결정적 시각·장소

21:40, L04에서 실랑이 시작 / 21:50, L04에서 떠밀고 퓨즈를 다시 꽂은 뒤 이탈

### 은폐

소이한은 나건우가 혼자 리허설을 하다 환풍 설비 고장으로 사고를 당한 것 같다고 주장하며, 그날 밤 로스팅룸에 갔던 사실과 실랑이는 언급하지 않는다.

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