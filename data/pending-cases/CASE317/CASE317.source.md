# CASE317 — 그물망이 놓친 밤
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

아시아 프리스타일 인도어 스카이다이빙 챔피언십 개막을 사흘 앞둔 실내 스카이다이빙 체험·훈련 센터 '플라이존(FlyZone)'. 대형 수직풍동 하부에는 강철 그물망 바닥과, 그 아래 터빈 정비 통로로 이어지는 점검용 해치가 있다.

## 톤

개막을 앞둔 설렘과 안전 점검의 압박이 뒤섞인 인도어 스카이다이빙 센터의 늦은 밤.

## 탐정의 진입

- 경로: `travel`

탐정은 며칠째 이 도시를 여행하던 중이었고, 마침 개막을 앞둔 챔피언십 소식에 이끌려 야간 체험 프로그램을 신청해 두었다가 폐장 직후 우연히 현장과 마주친다.

## 진실

**진범**: 하진혁 (CH01)
**공범**: 없음

### 동기

하진혁은 챔피언십 방송 중계권과 후원 계약을 앞두고 시설 안전을 자랑해 왔지만, 실제로는 노후한 터빈 블레이드 교체 비용을 아끼려 정비·안전점검 예산을 대회 마케팅 비용으로 돌려쓰며 교체 시기를 계속 미뤄 왔다. 민지호가 이를 발견하고 대회 전 블레이드 교체를 요구하며 방송사에도 알리겠다고 하자, 그의 입을 막으려 한다.

### 수법

하진혁은 폐장 후인 20시 50분경 점검 해치 앞에서 민지호와 실랑이를 벌이다, 21시경 그를 밀쳐 점검 통로 아래로 추락시켰다. 안전벨트 미착용에 의한 사고사로 위장하기 위해 그의 안전벨트 고리를 풀어 두었고, 민지호가 마모 증거를 정리해 둔 개인 USB를 챙겨 사라지게 했다.

### 결정적 시각·장소

20:50, L04 점검 해치 앞에서 실랑이 / 21:00, L04에서 민지호를 밀쳐 추락시킴.

### 은폐

하진혁은 민지호가 야간 점검 중 안전벨트를 채우지 않은 채 실수로 추락한 사고라고 주장하며, 그의 개인 USB가 사라진 사실은 언급하지 않는다.

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