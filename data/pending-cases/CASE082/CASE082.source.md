# CASE082 — 에칭조가 삼킨 판정
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

완제품업체 품질인증 실사를 사흘 앞둔 PCB 제조공장 '써킷포지'의 에칭·도금 작업동. 양산 전 마지막 에칭공정 검증이 한창이던 늦은 밤, 수석 품질엔지니어 방일솔이 에칭공정실 안에서 의식을 잃은 채 발견돼 병원으로 옮겨졌으나 사망이 확인된다.

## 톤

완제품업체 실사를 사흘 앞둔 긴박한 분위기와, 현장 동료 사이 신뢰가 무너지는 서늘함이 뒤섞인 분위기.

## 탐정의 진입

- 경로: `invited_by_acquaintance`

탐정은 며칠 전 오랜 지인인 송용율의 초대를 받아 써킷포지의 품질인증 준비 상황을 둘러보러 로비에 들어선 참이었다.

## 진실

**진범**: 서진경 (CH03)
**공범**: 없음

### 동기

서진경은 자재 원가를 낮추려 불량 PCB 상당수를 재검수 없이 합격 판정으로 밀어 넣어 온 사람이었다. 방일솔이 도금 두께 실측값과 판정표 사이의 어긋남을 짚어내 완제품업체 실사단에게 사흘 뒤 그대로 보고하겠다고 통보하자, 서진경은 실사 전에 그 보고 자체를 무마해야 한다는 압박에 몰렸다.

### 수법

그날 밤 서진경은 에칭공정실에서 방일솔을 붙잡고 판정표를 되돌려 달라 다그쳤고, 몸싸움 끝에 방일솔을 에칭조 개구부 쪽으로 세게 떠밀었다. 방일솔은 균형을 잃고 상반신이 개구부 안쪽으로 꺾이며 고농도 에칭액 증기를 그대로 들이마셨고, 얼굴과 팔에 화상을 입은 채 그 자리에서 의식을 잃었다.

### 결정적 시각·장소

D-1, 20:20, L03 에칭공정실에서 몸싸움 및 노출 / D-1, 20:22, L03 에칭공정실에서 의식 상실 / D-1, 20:45, L03 에칭공정실에서 흔적 정리.

### 은폐

서진경은 사고 직후 국소배기장치 흡입구 주변 잔여물을 닦아내며, 자신이 그 자리에서 방일솔과 부딪혔다는 흔적을 지우려 했다.

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