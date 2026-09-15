# CASE193 — 무두질통에 잠긴 이름
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

번화가 골목 안 작은 상가 건물 1층을 통째로 쓰는 수제 가죽공방 '가름결'. 탐정은 개인 채널에 올릴 장인 인터뷰 콘텐츠를 찍으러 마스터 장인 하선욱과 사전에 촬영 약속을 잡고 방문했다가, 안쪽 무두질 작업실에서 벌어진 소동과 마주친다.

## 톤

차분하지만 씁쓸한 뒷맛이 남는 정통 추리.

## 탐정의 진입

- 경로: `media_or_content_creation`

탐정은 개인 채널에 올릴 수공예 장인 인터뷰 콘텐츠를 촬영하러 하선욱과 사전에 약속을 잡고 가름결을 찾은 참이었다.

## 진실

**진범**: 소재원 (CH02)
**공범**: 없음

### 동기

소재원은 20년 동안 자신이 유일한 후계자라 믿어 온 하선욱의 독자적 무두질 기법이 외부 브랜드 대표 연아름에게 완전히 매각되어 남의 손에 넘어가게 됐다는 사실을 창고에서 우연히 읽은 계약서 초안으로 알게 되고, 자신이 쏟은 세월 전부가 지워진다는 상실감과 집착에 사로잡힌다.

### 수법

소재원은 작업실로 하선욱을 찾아가 계약 내용을 따져 물었고, 대화를 끊고 자리를 뜨려는 하선욱의 팔을 붙잡아 돌려세우려다 세게 밀쳤다. 균형을 잃은 하선욱이 뒤편 대형 침수조 안으로 넘어져 빠졌고, 소재원은 그가 물속에서 허우적대는 걸 곧바로 끌어올리지 않고 그대로 지켜보다 움직임이 멈춘 뒤에야 자리를 떴다.

### 결정적 시각·장소

14시 50분경, L02 무두질 작업실 침수조 앞.

### 은폐

소재원은 사고처럼 보이도록 침수조 주변의 미끄럼 방지 매트를 치우고, 자신이 읽었던 계약서 초안을 창고 소각통에 넣어 태워 없앤 뒤 아무 일도 없었다는 듯 창고에서 재단 작업을 계속했다.

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