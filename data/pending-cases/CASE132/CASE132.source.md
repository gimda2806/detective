# CASE132 — 테이블 위, 마지막 콜
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

국제 하이롤러 초청전 시드 발표를 사흘 앞둔 회원제 프라이빗 포커클럽 '로열플러시라운지'. 오늘 이른 아침, 전용 바에서 클럽 운영실장이 쓰러진 채 발견된다.

## 톤

느와르풍 하드보일드. 인물들 사이의 팽팽한 긴장과 위트가 공존하는 톤.

## 탐정의 진입

- 경로: `group_member`

탐정은 로열플러시라운지의 정회원으로, 이날 밤도 한지우와 함께 멤버 전용 테이블에서 칩을 정산하던 중이었다.

## 진실

**진범**: 매도훈 (CH05)
**공범**: 예찬승 (RFID 카드 조작 공모자. 살인 자체에는 가담하지 않았다.)

### 동기

과거 다른 카지노에서 카드 조작으로 해고된 이력이 있는 매도훈은, 이번 클럽에서도 예찬승과 공모해 VIP 테이블에 RFID 카드 리더를 설치해 카드를 조작해 왔다. 국제 초청전을 앞둔 장비 점검에서 선우진이 배선을 발견하고 추궁하자, 과거 이력과 이번 공모가 함께 발각될 위기에 몰려 그를 영구히 침묵시키려 했다.

### 수법

선우진이 매일 밤 감사 업무 후 습관적으로 마시는 개인 위스키 병에, 주류 저장고에 몰래 숨겨둔 메탄올 함유 밀주를 섞어 넣어 중독사시켰다.

### 결정적 시각·장소

사건 당일 새벽, 프라이빗 바(L01)에서 선우진이 위스키를 따라 마시기 전 매도훈이 그의 술병에 밀주를 섞었다.

### 은폐

사건 직후 보안관제실 카메라 로그에서 자신의 새벽 접근 기록을 지우려 했고, 밀주 유통 자체를 클럽이 몰래 들여온 값싼 밀수 양주 탓으로 돌려 단순 사고사처럼 보이게 하려 했다.

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