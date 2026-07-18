// Normalize the shared "Uchenik" demo row (what /api/user returns in demo mode, since
// /api/user does NOT honor the x-test-bypass seam). The client's lesson-nav unlock guard
// reads its completedLessonIds. We want EXACTLY lesson order 1 completed: unlocks lesson 2
// (maxUnlocked = highestCompleted+1 = 2) WITHOUT marking lesson 5 done. A lesson-5
// completion makes PromptInput render the "graduation" card instead of the chat textarea,
// which blocked the E2E. Test-fixture setup on dev.db only.
import Database from "better-sqlite3";
import { randomUUID } from "crypto";
const D = new Database("dev.db");
const uch = D.prepare('SELECT id,username,activeStep FROM "User" WHERE username=?').get("Uchenik");
if (uch) {
  D.prepare('DELETE FROM "LessonProgress" WHERE userId=?').run(uch.id);
  const l1 = D.prepare('SELECT id FROM "Lesson" WHERE "order"=1').get();
  D.prepare('INSERT INTO "LessonProgress" (id,userId,lessonId,completed,score,completedAt) VALUES (?,?,?,?,?,?)')
    .run(randomUUID(), uch.id, l1.id, 1, 100, new Date().toISOString());
  const rows = D.prepare('SELECT l."order" o FROM "LessonProgress" lp JOIN "Lesson" l ON l.id=lp.lessonId WHERE lp.userId=? AND lp.completed=1').all(uch.id).map(r=>r.o);
  console.log("Uchenik(demo) normalized -> completedLessons=", JSON.stringify(rows));
} else {
  console.log("no Uchenik row yet");
}
