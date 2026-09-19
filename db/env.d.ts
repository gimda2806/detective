declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    // 작업자 모드의 자물쇠. 안 걸어 두면 그 모드는 아예 열리지 않는다
    // (app/game.ts 의 openAuthorMode) — 기본이 잠김이라야 틀려도 안전하다.
    AUTHOR_MODE_PASSWORD?: string;
  }
}
