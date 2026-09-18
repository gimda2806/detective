# CASE008 — 마지막 잔에 남은 마음
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

재개장을 하루 앞둔 전통 한옥 다도문화원 '연다원'. 마당을 낀 ㄱ자 한옥으로, 대문을 들어서면 로비 겸 접견실이고 툇마루를 따라 안쪽으로 가면 넓은 체험실, 그 안쪽 끝에 원장의 개인 다실이 따로 있다. 마당 건너편이 찻잎을 덖고 말리는 제다실이고, 그 뒤로 관상용 화단이 있는 정원이 붙어 있다.

## 톤

전통과 격식 아래 눌러온 감정들이 하나씩 드러나는 차분하지만 팽팽한 분위기.

## 탐정의 진입

- 경로: `invited_by_acquaintance`

탐정은 내일 열릴 재개장 기념 시음회에 초대받아 하루 먼저 도착했다가, 원장의 급사 소식과 함께 사건에 휘말린다.

## 진실

**진범**: 강태민 (CH01)
**공범**: 없음

### 동기

15년간 이어온 스승이자 연인 관계에서 후계자 자리와 관계 모두를 동시에 잃게 된 데 대한 배신감과 질투.

### 수법

정원 화단에서 꺾은 협죽도 잎을 우려, 한선영이 매일 밤 혼자 마시는 개인용 보이차 다호에 섞어 급성 부정맥을 유발했다.

### 결정적 시각·장소

T10(21:00, L03)에서 독을 준비하고, T11(21:25, L02)에서 마지막으로 담판을 지은 뒤, T13~T14(21:40~22:10, L02)에서 한선영이 차를 마시고 쓰러졌다.

### 은폐

협죽도 잎 뭉치를 제다실 건조대 뒤편에 숨기고, 한선영의 기존 부정맥 지병을 이용해 병사처럼 보이도록 방치했다.

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