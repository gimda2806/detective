# CASE049 — 온열실이 식은 시간
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

도심 골목 안 한옥을 개조한 프라이빗 웰니스 하우스 '온담(溫潭)'. 회원제로 운영되는 이곳은 온열관리실과 개인 조제실을 갖추고, 표건과 차유담 부부가 6년째 함께 운영해 왔다. 최근 두 사람은 근처 상가로 확장 이전을 준비하며 신규 인력을 늘리는 중이다.

## 톤

회원제 프라이빗 스파 특유의 정제된 정적과, 그 정적을 깨는 동업자·직원들 사이의 미묘한 긴장.

## 탐정의 진입

- 경로: `customer_or_client`

탐정은 반년째 이곳의 회원으로, 격주로 온열관리를 받으러 다닌다. 그날도 저녁 예약을 잡고 로비에 들어서던 참이었다.

## 진실

**진범**: 위소담 (CH02)
**공범**: 없음

### 동기

위소담은 8년 전 몰락한 조향공방 '류하'의 대표였던 자신의 어머니 류인숙이, 동업자였던 차유담에게 독자 개발한 배합비를 가로채인 뒤 그 여파로 병을 얻어 세상을 떠났다고 믿는다. 신분을 숨기고 1년 전 온담에 입사해 차유담 곁에서 때를 기다리다, 해묵은 원한을 갚기 위해 범행을 계획한다.

### 수법

위소담은 사건 3일 전 조제실에 혼자 남아 차유담이 심한 알레르기 반응을 보이는 성분을 넣은 연고를 만들어 두고, 사건 당일 저녁 차유담의 개인 연고 통과 몰래 바꿔치기한다. 차유담은 평소처럼 그 연고를 바르고 온열실에 들어가고, 실내 열기에 흡수가 빨라진 알레르기 성분이 전신 쇼크를 일으켜 심정지에 이른다.

### 결정적 시각·장소

사건 당일 21:40경, 온열실(L03).

### 은폐

위소담은 원래 연고 용기를 씻어 조제실 폐기물 통 안쪽에 숨기고, 라경윤에게 차유담이 요즘 피곤해서 평소 챙기던 알레르기 약을 자주 걸렀다는 말을 흘려 자연스러운 사고사처럼 보이도록 유도한다.

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