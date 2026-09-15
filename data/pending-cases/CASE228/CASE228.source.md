# CASE228 — 미끄러지지 않은 흔적
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

20년째 다치거나 밀렵으로 압수된 매를 돌보다 야생으로 돌려보내는 산기슭의 보호매 재활센터 겸 주말 매사냥 체험장 '창공가온'. 3년 전 세상을 떠난 설립자의 두 자녀가 나란히 공동대표를 맡아온 이곳에서, 특별한 행사도 없이 지나가는 일요일 오전 체험 프로그램을 마친 직후 공동대표 중 한 명이 먹이준비실 안에서 쓰러진 채 발견된다.

## 톤

산기슭의 서늘한 공기와 인간관계의 복잡한 셈법이 교차하는, 담담하면서도 씁쓸한 정통 추리 톤

## 탐정의 진입

- 경로: `professional_consultant`

탐정은 지자체 야생동물보호과가 위촉한 분기별 사육환경 자문위원 자격으로, 이번 분기 정기 점검을 위해 이 센터를 찾은 참이다.

## 진실

**진범**: 소재웅 (CH01)
**공범**: 없음

### 동기

소재웅은 사채 빚을 갚기 위해 동생 소재은 몰래 매매 계약서에 그녀의 서명을 위조해 부지를 개발업체에 매각하려 했다. 소재은이 위조 사실을 알아채고 처분금지 가처분 신청으로 계약을 막으려 하자, 유일한 재산인 땅을 잃을 위기에 몰린 소재웅이 동생을 막기 위해 범행을 계획한다.

### 수법

소재웅이 먹이준비실로 동생을 뒤따라 들어가 가처분 신청을 그만두라고 요구하고, 동생이 거절하자 손질대 위에 놓여 있던 먹이용 손질칼을 손에 쥔 채 격분해 동생의 가슴을 찔러 살해한다.

### 결정적 시각·장소

일요일 체험 프로그램이 끝난 직후, 먹이준비실 안에서.

### 은폐

소재웅이 동생의 시신을 배수구 쪽으로 끌어다 미끄러져 넘어진 자세로 바꿔 놓고 손질칼을 그녀의 손에 쥔 것처럼 흔적을 남긴 뒤, 사무실로 돌아가 동생의 가방에서 가처분 신청서 초안을 빼내 없애 동기를 감추려 한다.

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