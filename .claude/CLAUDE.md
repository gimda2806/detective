# graphify
- **graphify** (`.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

# ponytail
- **ponytail** (`.claude/skills/ponytail/SKILL.md`) - forces the leanest working solution (YAGNI ladder: skip it, reuse it, stdlib, native feature, existing dependency, one line, only then custom code). Trigger: user says "ponytail", "be lazy", "lazy mode", "simplest solution", "minimal solution", "yagni", "do less", "shortest path", or complains about over-engineering/bloat/boilerplate.
Manually installed skill file only (no forced SessionStart hook) — invoke it deliberately when the trigger phrases above appear, not on every response by default.
