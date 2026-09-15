# CASE127 — 패널 위의 오 분
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

국제시가협회 공인 라운지 인증 갱신 심사를 사흘 앞둔 고급 시가 전문 멤버십 라운지 '아바나로(Havana Row)'. 이른 저녁, 멤버십 총괄매니저가 워크인 휴미더 안 질소 소화설비 근처에서 의식을 잃은 채 발견되어 병원으로 옮겨졌으나 사망이 확인된다.

## 톤

고급 멤버십 클럽 특유의 절제된 격식과 그 이면의 재정난이 대비되는 분위기.

## 탐정의 진입

- 경로: `group_member`

탐정은 '아바나로'의 정회원으로, 그날 저녁도 정기 모임에 참석해 회원 대표 여준한과 함께 라운지에 있었다.

## 진실

**진범**: 진태호 (CH01)
**공범**: 없음

### 동기

라운지는 지난 2년간 매출 부진으로 경영난에 시달려 왔고, 진태호는 부족분을 메우기 위해 동남아산 저가 시가에 정품 쿠바산 라벨을 위조해 붙여 판매해 왔다. 국제시가협회 공인 라운지 인증 갱신 심사가 사흘 앞으로 다가왔고, 심사에서는 원산지·통관 서류를 전수 확인한다. 총괄매니저 설웅재가 최근 수입 인보이스와 실제 재고 라벨이 일치하지 않는다는 사실을 발견해 협회에 알리려 했다.

### 수법

진태호는 저녁 무렵 워크인 휴미더에서 설웅재와 대치했다. 설웅재가 협회에 신고하겠다고 하자 격분한 진태호는 그를 안에 남겨둔 채 문을 밖에서 잠그고, 곧이어 화재진압용 질소 소화설비를 수동으로 작동시켜 산소를 빼내 질식시켰다.

### 결정적 시각·장소

19:45, L03 워크인 휴미더에서 문을 잠금 / 19:50, L03에서 질소 소화설비 수동 작동.

### 은폐

진태호는 설비 오작동 사고라고 주장하며, 위조 라벨이 붙은 재고를 서둘러 치우려 한다.

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