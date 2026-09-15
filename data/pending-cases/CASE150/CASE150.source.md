# CASE150 — 멈춘 카운트다운
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

신규 코인 상장 발표 생중계를 한 시간 앞둔 가상자산 거래소 '오르빗체인(OrbitChain)'. 보안팀장이 콜드월렛 보안실 안에서 쓰러진 채 발견돼 병원으로 옮겨졌으나 사망이 확인된다.

## 톤

빠르게 돌아가는 스타트업 특유의 긴장감과 배신감이 뒤섞인 분위기.

## 탐정의 진입

- 경로: `online_discovery_self_initiated`

탐정은 전날 밤부터 루멘코인 관련 온라인 커뮤니티에서 떠돌던 자전거래 의심 스레드를 눈여겨보다가, 거래소 공식 채널에 갑자기 뜬 '보안팀장 응급 이송' 소식을 보고 스스로 판단해 거래소로 향한다.

## 진실

**진범**: 봉재현 (CH01)
**공범**: 없음

### 동기

봉재현은 상장을 앞두고 루멘코인 시세를 인위적으로 끌어올리기 위해, 채린우 명의로 몰래 개설한 미승인 핫월렛들을 통해 자전거래를 반복해 왔다. 정혜솔이 정기 감사 중 이 사실을 발견해 이사회에 보고하려 하자, 상장 전까지 시간을 벌어야 한다는 압박에 몰렸다.

### 수법

정혜솔을 콜드월렛 보안실로 불러들여 감사 자료를 두고 언쟁하다 몸싸움이 벌어졌고, 정혜솔이 다중서명 캐비닛 모서리에 부딪혀 의식을 잃자 그대로 문을 밖에서 잠그고 나갔다.

### 결정적 시각·장소

13시 40분, L02 콜드월렛 보안실에서 몸싸움 발생 / 13시 50분, 같은 장소에서 감금.

### 은폐

봉재현은 정혜솔이 평소 과로가 잦았던 터라 스스로 쓰러진 것처럼 보이길 바라며, 보안실이 전자기 차폐 구조라 신고가 늦어질 수밖에 없었다는 핑계로 시간을 끌었다.

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