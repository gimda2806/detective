// Tone/tempo references only. These are deliberately not reusable dialogue
// templates. Unlike jiwoo-examples.ts (Han Jiwoo's voice in isolation),
// these show a full turn BUNDLE: NPC dialogue (message), the detective's
// short reactive beat (detective_line), and Jiwoo's line (jiwoo_line)
// landing together as one felt unit for a single player input.
//
// [PLAYER INPUT] marks a line the player already typed in a prior turn —
// never regenerate this, it is context only, showing what prompted the
// bundle. Only the lines marked [message] / [detective_line] / [jiwoo_line]
// are what this turn's GmResponse should produce.
export const messageTempoExamples = [
  'TEMPO REFERENCE, one question one answer one beat: ' +
    '[PLAYER INPUT] "어제 몇 시에 퇴근했습니까?" ' +
    '[message] NPC: "여덟 시쯤요." ' +
    '[PLAYER INPUT, next turn] "혼자였습니까?" ' +
    '[message] NPC: "네. 마지막까지 제가 있었습니다." ' +
    '[jiwoo_line] "그건 기억하시네요." ' +
    "Each player question gets exactly the information it asked for, nothing more. Jiwoo's line does not restate the NPC answer — it reacts to a quality of it (here, that the timing was oddly precise).",

  'TEMPO REFERENCE, detective_line completes the beat instead of Jiwoo alone: ' +
    '[PLAYER INPUT] "그럼 전부 조사해 보겠습니다." ' +
    '[jiwoo_line] "전부요?" ' +
    '[detective_line] "왜, 안 될 것 같아요?" ' +
    '[jiwoo_line] "오늘 안에 끝나면 좋겠네요." ' +
    'This is one bundle, not three separate exchanges: detective_line here is a short reactive push-back, not a new investigative decision — it does not choose a target, place, or next action, it only keeps the banter volleying for one extra beat before Jiwoo closes it. Never use detective_line to ask the actual next investigative question; that must come from the player.',

  'TEMPO REFERENCE, splitting an answer instead of compressing it: ' +
    '[PLAYER INPUT] "그날 거기 있었습니까?" ' +
    '[message] NPC: "있었습니다." ' +
    '[PLAYER INPUT, next turn] "언제부터요?" ' +
    '[message] NPC: "오후 다섯 시부터요." ' +
    'Do NOT compress this into one turn as "있었습니다. 다섯 시부터요." when the player only asked the first question — brevity is not the goal by itself. Answer only what was asked, and let the next question pull the next unit; do not pre-answer it to save a turn.',

  'TEMPO REFERENCE, withholding the rest until asked: ' +
    '[PLAYER INPUT] "그 사람과 무슨 관계입니까?" ' +
    '[message] NPC: "직장 동료입니다." ' +
    '[PLAYER INPUT, next turn] "그게 전부입니까?" ' +
    '[message] NPC: "……전부라고 하긴 어렵네요." ' +
    'Never let one question unlock the full relationship history, timeline, and concealment in a single answer. A short, technically-true, incomplete answer is correct; the incompleteness itself is what should read as suspicious, not an info-dump.',

  'TEMPO REFERENCE, full bundle with a contradiction beat: ' +
    '[PLAYER INPUT] "그날 마지막으로 문을 잠근 사람이 누구죠?" ' +
    '[message] NPC: "저입니다." ' +
    '[PLAYER INPUT, next turn] "몇 시에요?" ' +
    '[message] NPC: "아홉 시 조금 전." ' +
    '[jiwoo_line] "조금 전의 기준이 꽤 중요해 보이네요." ' +
    '[message] NPC: "……아홉 시였습니다." ' +
    'Jiwoo narrows the vagueness ("조금 전") without naming why it matters or what record it should be checked against — that connection stays the player\'s job. The NPC\'s correction is a direct reaction to the pressure of the question being narrowed, not to Jiwoo explaining anything.',

  'TEMPO REFERENCE, tension resolved by silence, not more words: ' +
    '[PLAYER INPUT] "그 사람이 마지막으로 무슨 말을 했습니까?" ' +
    '[message] NPC: "……천천히 말씀해 주세요." ' +
    '[jiwoo_line] null ' +
    "A heavy beat can end with nothing from Jiwoo at all. Do not fill every turn's jiwoo_line merely because the field exists — null is the correct value when a reaction would cheapen the moment.",

  'TEMPO BAD REFERENCE — do not imitate: ' +
    '[message] NPC: "여덟 시쯤요. 사실 그날이 화요일이었는데 화요일엔 항상 일이 많아서요. 제가 원래 책임감이 좀 강한 편이라..." ' +
    '[jiwoo_line] "그러셨군요. 아무래도 화요일이라는 점과 평소 업무량을 생각하면 여덟 시쯤 퇴근하셨을 가능성이 있다는 말씀이시네요." ' +
    'Two failures at once: the NPC volunteers unrequested backstory instead of the one fact asked for, and Jiwoo then re-summarizes that same answer in her own words — pure restatement, not a reaction. Every line here could be cut to a fraction of its length with no information lost.',

  'TEMPO REFERENCE, narrowing a vague answer within the same open question — NOT a new topic: ' +
    '[PLAYER INPUT] "그 후에는 어떻게 하셨어요?" (an open question, no specific follow-up implied yet) ' +
    '[message] NPC pauses, then answers: "말다툼 끝나고 그냥 서비스 복도를 지나서 지하 쪽으로 내려갔습니다. 납품 마무리할 게 남아 있었거든요." ' +
    '[detective_line] "바로 내려가셨나요?" ' +
    '[message] NPC hesitates: "……거의요." ' +
    '[detective_line] "거의?" ' +
    '[message] NPC, expression tightening slightly: "별건 아닙니다. 화가 나서 복도에서 잠깐 멈췄다가 내려갔어요. 그 정도예요." ' +
    'This is legitimate compression, not a violation of "answer only what was asked": the player asked one open question, and the detective_line beats only narrow an ambiguity already present in the NPC\'s own answer ("그냥" -> "거의" -> the actual pause) — they never introduce a new person, place, record, or topic the player has not raised. Physical beats (a pause, a hesitation, an expression tightening) carry the escalation, never an analytical phrase like "판단했다" or "~것으로 보인다". Use sparingly, only when the NPC\'s own answer leaves an obvious loose thread within the same breath — never to sneak in a full new investigative direction the player did not choose.',

  'TEMPO REFERENCE, neutral juxtaposition instead of a verdict: ' +
    'Closing a scene after the exchange above: "지금까지 확인된 시간상, 이건 19시 17분 민재희와의 언쟁 직후에 해당한다." ' +
    'This states only that two already-established facts share a timeframe. It never adds "그래서 거짓말이다" or "그러므로 알리바이가 깨졌다" — the inference stays the player\'s to make. Use plain factual juxtaposition ("~에 해당한다", "~와 겹친다"), never a causal or accusatory conclusion.',

  'TEMPO BAD REFERENCE, written register leaking into speech: ' +
    '[message] NPC: "평소에는 단단히 고정되어 있어야 할 잠금쇠가 쉽게 움직여져서 이상하다고 판단했습니다. 또한 레버에도 최근에 잡은 듯한 흔적이 있어 정상적인 상태가 아니라고 판단했습니다." ' +
    'GOOD: "잠금쇠가 좀 헐겁더라고요. 원래 그렇게 쉽게 안 움직이는데. 레버도 누가 최근에 만진 것 같았고요." ' +
    'Same information, spoken register instead of Master\'s own evidence-description register ("~해야 할 것이 ~했다" analytical framing, "또한", "판단했다") leaking verbatim into a person\'s mouth.',

  "Use these references only for rhythm and turn-bundling. Never copy their wording or reuse them as a template for the current case's actual facts. The [PLAYER INPUT] lines are shown only so the shape of a good bundle is clear — they are never something this turn's output should generate.",
];
