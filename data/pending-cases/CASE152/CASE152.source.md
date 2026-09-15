# CASE152 — 광택이 감춘 차대번호
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

전국 클래식카 콩쿠르델레강스 출품을 사흘 앞둔 빈티지카 복원 전문 개러지 '올드레인'. 마지막 손질을 마친 출품작 옆에서, 복원을 총괄해 온 수석 기술자가 하루째 모습을 감춘다.

## 톤

쇼룸의 광택과 정비소 특유의 기름 냄새가 뒤섞인 폐쇄적인 공간.

## 탐정의 진입

- 경로: `customer_or_client`

탐정은 자신의 오래된 세단 브레이크 점검을 맡기러 개러지 '올드레인'을 찾았다가, 접수대가 어수선한 것을 보고 그대로 눌러앉아 상황을 살피게 된다.

## 진실

**진범**: 견태오 (CH02)
**공범**: 없음

### 동기

견태오는 이번 콩쿠르델레강스 출품이 무산되면 후원 계약이 자동 해지된다는 것을 알고 있었다. 그런데 출품작 '실버섀도우'는 사실 15년 전 대형 사고로 전손 처리된 차체 잔해에, 폐차장에서 사들인 다른 개체의 프레임 각인을 갈아내고 새로 새겨 만든 재조립차였다. 옥재민이 복원 마감 과정에서 이 사실을 알아챘다.

### 수법

견태오는 마감 전날 밤 도장 작업장에서 옥재민과 다투다 몸싸움 끝에 그의 휴대전화를 떨어뜨렸고, 그를 지하 도료 보관실로 데려가 문을 밖에서 잠갔다.

### 결정적 시각·장소

19:45, L02 도장 작업장에서 몸싸움 끝 휴대전화 파손 / 20:00, L05 지하 도료 보관실에 감금.

### 은폐

견태오는 옥재민이 개인 사정으로 잠시 자리를 비운 것 같다고 둘러대며, 콩쿠르 출품을 그대로 강행하려 한다.

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